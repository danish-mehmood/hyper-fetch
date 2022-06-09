import {
  NullableKeys,
  NegativeTypes,
  ExtractParams,
  ExtractRequest,
  HttpMethodsType,
  ExtractQueryParams,
  ExtractClientOptions,
} from "types";
import { Command } from "command";
import { ClientResponseType, ClientQueryParamsType } from "client";

// Progress
export type ClientProgressEvent = { total: number; loaded: number };
export type ClientProgressResponse = { progress: number; timeLeft: number; sizeLeft: number };

// Dump

/**
 * Dump of the command used to later recreate it
 */
export type CommandDump<
  Command extends CommandInstance,
  // Bellow generics provided only to overcome the typescript bugs
  ClientOptions = unknown,
  QueryParamsType = ClientQueryParamsType,
> = {
  commandOptions: CommandConfig<string, ClientOptions | ExtractClientOptions<Command>>;
  endpoint: string;
  method: HttpMethodsType;
  headers?: HeadersInit;
  auth: boolean;
  cancelable: boolean;
  retry: number;
  retryTime: number;
  cache: boolean;
  cacheTime: number;
  queued: boolean;
  offline: boolean;
  disableResponseInterceptors: boolean | undefined;
  disableRequestInterceptors: boolean | undefined;
  options?: ClientOptions | ExtractClientOptions<Command>;
  data: CommandData<ExtractRequest<Command>, unknown>;
  params: ExtractParams<Command> | NegativeTypes;
  queryParams: QueryParamsType | ExtractQueryParams<Command> | NegativeTypes;
  abortKey: string;
  cacheKey: string;
  queueKey: string;
  effectKey: string;
  used: boolean;
  updatedAbortKey: boolean;
  updatedCacheKey: boolean;
  updatedQueueKey: boolean;
  updatedEffectKey: boolean;
  deduplicate: boolean;
  deduplicateTime: number;
};

// Command

/**
 * Configuration options for command creation
 */
export type CommandConfig<GenericEndpoint extends string, ClientOptions> = {
  /**
   * Determine the endpoint for command request
   */
  endpoint: GenericEndpoint;
  /**
   * Custom headers for command
   */
  headers?: HeadersInit;
  /**
   * Should the onAuth method get called on this command
   */
  auth?: boolean;
  /**
   * Request method GET | POST | PATCH | PUT | DELETE
   */
  method?: HttpMethodsType;
  /**
   * Should enable cancelable mode in the Dispatcher
   */
  cancelable?: boolean;
  /**
   * Retry count when request is failed
   */
  retry?: number;
  /**
   * Retry time delay between retries
   */
  retryTime?: number;
  /**
   * Should we save the response to cache
   */
  cache?: boolean;
  /**
   * Time for which the cache is considered up-to-date
   */
  cacheTime?: number;
  /**
   * Should the requests from this command be send one-by-one
   */
  queued?: boolean;
  /**
   * Do we want to store request made in offline mode for latter use when we go back online
   */
  offline?: boolean;
  /**
   * Disable post-request interceptors
   */
  disableResponseInterceptors?: boolean;
  /**
   * Disable pre-request interceptors
   */
  disableRequestInterceptors?: boolean;
  /**
   * Additional options for your client, by default XHR options
   */
  options?: ClientOptions;
  /**
   * Key which will be used to cancel requests. Autogenerated by default.
   */
  abortKey?: string;
  /**
   * Key which will be used to cache requests. Autogenerated by default.
   */
  cacheKey?: string;
  /**
   * Key which will be used to queue requests. Autogenerated by default.
   */
  queueKey?: string;
  /**
   * Key which will be used to use effects. Autogenerated by default.
   */
  effectKey?: string;
  /**
   * Should we deduplicate two requests made at the same time into one
   */
  deduplicate?: boolean;
  /**
   * Time of pooling for the deduplication to be active (default 10ms)
   */
  deduplicateTime?: number;
};

export type CommandData<PayloadType, MappedData> =
  | (MappedData extends undefined ? PayloadType : MappedData)
  | NegativeTypes;

export type CommandCurrentType<
  ResponseType,
  PayloadType,
  QueryParamsType,
  ErrorType,
  GenericEndpoint extends string,
  ClientOptions,
  MappedData,
> = {
  used?: boolean;
  params?: ExtractRouteParams<GenericEndpoint> | NegativeTypes;
  queryParams?: QueryParamsType | NegativeTypes;
  data?: CommandData<PayloadType, MappedData>;
  mockCallback?: ((data: PayloadType) => ClientResponseType<ResponseType, ErrorType>) | undefined;
  headers?: HeadersInit;
  updatedAbortKey?: boolean;
  updatedCacheKey?: boolean;
  updatedQueueKey?: boolean;
  updatedEffectKey?: boolean;
} & Partial<NullableKeys<CommandConfig<GenericEndpoint, ClientOptions>>>;

export type ParamType = string | number;
export type ParamsType = Record<string, ParamType>;

export type ExtractRouteParams<T extends string> = string extends T
  ? NegativeTypes
  : T extends `${string}:${infer Param}/${infer Rest}`
  ? { [k in Param | keyof ExtractRouteParams<Rest>]: ParamType }
  : T extends `${string}:${infer Param}`
  ? { [k in Param]: ParamType }
  : NegativeTypes;

export type FetchQueryParamsType<QueryParamsType, HasQuery extends true | false = false> = HasQuery extends true
  ? { queryParams?: NegativeTypes }
  : {
      queryParams?: QueryParamsType | string;
    };

export type FetchOptionsType = { headers?: HeadersInit };

export type FetchParamsType<
  EndpointType extends string,
  HasParams extends true | false = false,
> = ExtractRouteParams<EndpointType> extends NegativeTypes
  ? { params?: NegativeTypes }
  : true extends HasParams
  ? { params?: NegativeTypes }
  : { params: ExtractRouteParams<EndpointType> };

export type FetchRequestDataType<PayloadType, HasData extends true | false = false> = PayloadType extends NegativeTypes
  ? { data?: NegativeTypes }
  : HasData extends true
  ? { data?: NegativeTypes }
  : { data: PayloadType };

export type CommandQueueOptions = {
  dispatcherType?: "auto" | "fetch" | "submit";
};

export type FetchType<
  PayloadType,
  QueryParamsType,
  EndpointType extends string,
  HasData extends true | false,
  HasParams extends true | false,
  HasQuery extends true | false,
  AdditionalOptions = unknown,
> = FetchQueryParamsType<QueryParamsType, HasQuery> &
  FetchParamsType<EndpointType, HasParams> &
  FetchRequestDataType<PayloadType, HasData> &
  FetchOptionsType &
  AdditionalOptions;

export type FetchMethodType<
  ResponseType,
  PayloadType,
  QueryParamsType,
  ErrorType,
  EndpointType extends string,
  HasData extends true | false,
  HasParams extends true | false,
  HasQuery extends true | false,
  AdditionalOptions = unknown,
> = FetchType<
  PayloadType,
  QueryParamsType,
  EndpointType,
  HasData,
  HasParams,
  HasQuery,
  AdditionalOptions
>["data"] extends any
  ? (
      options?: FetchType<PayloadType, QueryParamsType, EndpointType, HasData, HasParams, HasQuery, AdditionalOptions>,
    ) => Promise<ClientResponseType<ResponseType, ErrorType>>
  : FetchType<
      PayloadType,
      QueryParamsType,
      EndpointType,
      HasData,
      HasParams,
      HasQuery,
      AdditionalOptions
    >["data"] extends NegativeTypes
  ? FetchType<
      PayloadType,
      QueryParamsType,
      EndpointType,
      HasData,
      HasParams,
      HasQuery,
      AdditionalOptions
    >["params"] extends NegativeTypes
    ? (
        options?: FetchType<
          PayloadType,
          QueryParamsType,
          EndpointType,
          HasData,
          HasParams,
          HasQuery,
          AdditionalOptions
        >,
      ) => Promise<ClientResponseType<ResponseType, ErrorType>>
    : (
        options: FetchType<PayloadType, QueryParamsType, EndpointType, HasData, HasParams, HasQuery, AdditionalOptions>,
      ) => Promise<ClientResponseType<ResponseType, ErrorType>>
  : (
      options: FetchType<PayloadType, QueryParamsType, EndpointType, HasData, HasParams, HasQuery>,
    ) => Promise<ClientResponseType<ResponseType, ErrorType>>;

export type CommandInstance = Command<any, any, any, any, any, any, any, any, any, any, any>;