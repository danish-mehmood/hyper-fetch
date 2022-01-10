import {
  RequestInterceptorCallback,
  ResponseInterceptorCallback,
  ErrorMessageMapperCallback,
  FetchBuilderProps,
  CommandManager,
  FetchBuilderErrorType,
} from "builder";
import { Cache, isEqual } from "cache";
import { Manager } from "manager";
import { FetchQueue, SubmitQueue } from "queues";
import { FetchCommand, FetchCommandOptions, FetchCommandInstance } from "command";
import { ClientType, FetchClientXHR, fetchClient, ClientResponseType, ClientQueryParamsType } from "client";
import { FetchActionInstance } from "action";

export class FetchBuilder<ErrorType extends FetchBuilderErrorType = Error, ClientOptions = FetchClientXHR> {
  readonly baseUrl: string;
  readonly debug: boolean;
  readonly options: ClientOptions | undefined;

  builded = false;

  onErrorCallback: ErrorMessageMapperCallback<ErrorType> | undefined;
  onRequestCallbacks: RequestInterceptorCallback[] = [];
  onResponseCallbacks: ResponseInterceptorCallback[] = [];

  // Config
  commandManager: CommandManager = new CommandManager();
  client: ClientType<ErrorType, ClientOptions> = fetchClient;
  cache: Cache<ErrorType, ClientOptions>;
  manager: Manager;
  fetchQueue: FetchQueue<ErrorType, ClientOptions>;
  submitQueue: SubmitQueue<ErrorType, ClientOptions>;
  deepEqual: typeof isEqual;

  // Registered requests Actions
  actions: FetchActionInstance[] = [];

  constructor({
    baseUrl,
    debug,
    options,
    cache,
    manager,
    fetchQueue,
    submitQueue,
    deepEqual,
  }: FetchBuilderProps<ErrorType, ClientOptions>) {
    this.baseUrl = baseUrl;
    this.debug = debug || false;
    this.options = options;

    // IMPORTANT: Do not change initialization order as it's crucial for dependencies and 'this' usage
    this.deepEqual = deepEqual || isEqual;
    this.manager = manager?.(this) || new Manager();
    this.cache = cache?.(this) || new Cache(this);
    this.fetchQueue = fetchQueue?.(this) || new FetchQueue<ErrorType, ClientOptions>(this);
    this.submitQueue = submitQueue?.(this) || new SubmitQueue<ErrorType, ClientOptions>(this);
  }

  setClient = (callback: ClientType<ErrorType, ClientOptions>): FetchBuilder<ErrorType, ClientOptions> => {
    this.client = callback;
    return this;
  };

  onError = (callback: ErrorMessageMapperCallback<ErrorType>): FetchBuilder<ErrorType, ClientOptions> => {
    this.onErrorCallback = callback;
    return this;
  };

  onRequest = (callback: RequestInterceptorCallback): FetchBuilder<ErrorType, ClientOptions> => {
    this.onRequestCallbacks.push(callback);
    return this;
  };

  onResponse = (callback: ResponseInterceptorCallback): FetchBuilder<ErrorType, ClientOptions> => {
    this.onResponseCallbacks.push(callback);
    return this;
  };

  clear = () => {
    this.cache.clear();
    this.fetchQueue.clear();
    this.submitQueue.clear();
    this.commandManager.abortControllers.clear();

    this.cache.emitter.removeAllListeners();
    this.fetchQueue.emitter.removeAllListeners();
    this.submitQueue.emitter.removeAllListeners();
    this.commandManager.emitter.removeAllListeners();
  };

  /**
   * Helper used by http client to apply the modifications of request command
   * @param command
   * @returns
   */
  modifyRequest = async <T extends FetchCommandInstance>(command: T): Promise<T> => {
    let newCommand = command;
    if (!command.commandOptions.disableRequestInterceptors) {
      // eslint-disable-next-line no-restricted-syntax
      for await (const interceptor of this.onRequestCallbacks) {
        newCommand = (await interceptor(command)) as T;
      }
    }
    return newCommand;
  };

  /**
   * Helper used by http client to apply the modifications of response from command
   * @param command
   * @returns
   */
  modifyResponse = async <T extends FetchCommandInstance>(response: ClientResponseType<any, ErrorType>, command: T) => {
    let newResponse = response;
    if (!command.commandOptions.disableResponseInterceptors) {
      // eslint-disable-next-line no-restricted-syntax
      for await (const interceptor of this.onResponseCallbacks) {
        newResponse = await interceptor(response, command);
      }
    }
    return newResponse;
  };

  public createCommand = <
    ResponseType,
    PayloadType = undefined,
    QueryParamsType extends ClientQueryParamsType = ClientQueryParamsType,
  >() => {
    if (!this.builded) {
      throw new Error(`To create new commands you have to first use the build method on FetchBuilder class.
      Build method indicates the ended setup and prevents synchronization/registration issues.`);
    }

    return <EndpointType extends string>(
      params: FetchCommandOptions<EndpointType, ClientOptions>,
    ): FetchCommand<ResponseType, PayloadType, QueryParamsType, ErrorType, EndpointType, ClientOptions> =>
      new FetchCommand<ResponseType, PayloadType, QueryParamsType, ErrorType, EndpointType, ClientOptions>(
        this,
        params,
      );
  };

  public addActions = (actions: FetchActionInstance[]) => {
    if (this.builded) {
      throw new Error(`Actions can be applied only before usage of build method on FetchBuilder class.
      Build method indicates the ended setup and prevents synchronization/registration issues.`);
    }

    // Check for duplicated names of actions
    this.actions.forEach((currentAction) => {
      const hasDuplicate = actions.some((action) => action.getName() === currentAction.getName());

      if (hasDuplicate) {
        throw new Error("Fetch action names must be unique.");
      }
    });

    this.actions = this.actions.concat(actions);

    return this;
  };

  public removeAction = (action: FetchActionInstance | string) => {
    const name = typeof action === "string" ? action : action?.getName();
    this.actions = this.actions.filter((currentAction) => currentAction.getName() !== name);

    return this;
  };

  build = () => {
    this.builded = true;

    /**
     * Start flushing persistent queues
     */
    this.fetchQueue.flushAll();
    this.submitQueue.flushAll();

    return this;
  };
}