import { FetchCommandInstance } from "command";
import { getCacheData, getCacheInstanceKey } from "cache";
import { ExtractResponse } from "types";
import { CacheStoreKeyType, CacheValueType, CacheStoreValueType, CacheSetDataType } from "./cache.types";
import { CACHE_EVENTS } from "./cache.events";
import { isEqual } from "./cache.utils";
import { FetchBuilderConfig } from "../builder/fetch.builder.types";

/**
 * Cache class should be initialized per every command instance(not modified with params or queryParams).
 * This way we create container which contains different requests to the same endpoint.
 * With this segregation of data we can keep paginated data, filtered data, without overriding it between not related fetches.
 * Key for interactions should be generated later in the hooks with getCacheKey util function, which joins the stringified values to create isolated space.
 *
 * Example structure:
 *
 * CacheStore:
 *   endpoint => "GET_/users/1" (cacheKey) :
 *        caches => ["/users/1", {...}], ["/users/1?something=true", {...}], ["/users/1?something=false", {...}]
 *   endpoint => "GET_/users" :
 *        caches => ["/users" (key), {...}], ["/users?page=1", {...}], ["/users?page=2", {...}], ["/users?search=mac", {...}]
 */
export class Cache<T extends FetchCommandInstance> {
  builderConfig: FetchBuilderConfig<unknown, unknown>;
  private readonly cacheKey: CacheStoreKeyType;

  constructor(private fetchCommand: T, private customCacheKey?: string) {
    this.builderConfig = this.fetchCommand.builderConfig;
    this.cacheKey = getCacheInstanceKey(this.fetchCommand, this.customCacheKey);
    this.mount();
  }

  set = ({
    key,
    response,
    retries,
    deepCompareFn = isEqual,
    isRefreshed,
    timestamp = new Date(),
  }: CacheSetDataType<T>): void => {
    const cacheEntity = this.builderConfig.cache.get(this.cacheKey);
    const cachedData = cacheEntity?.get(key);
    // We have to compare stored data with deepCompare, this will allow us to limit rerendering
    const equal = !!deepCompareFn?.(cachedData?.response, response);

    // Refresh/Retry error is saved separate to not confuse render with having already cached data and refreshed one throwing error
    // Keeping it in separate location let us to handle refreshing errors in different ways
    const refreshError = isRefreshed ? response[1] : null;
    const retryError = retries ? response[1] : null;
    // Once refresh error occurs we don't want to override already valid data in our cache with the thrown error
    // We need to check it against cache and return last valid data we have
    const dataToSave = getCacheData(cachedData?.response, response, refreshError, retryError);

    const newData: CacheValueType = { response: dataToSave, retries, refreshError, retryError, isRefreshed, timestamp };

    if (cacheEntity && !equal) {
      cacheEntity.set(key, newData);
      CACHE_EVENTS.set<T>(key, newData);
    }
  };

  get = (key: string): CacheValueType<ExtractResponse<T>> | undefined => {
    const cacheEntity = this.builderConfig.cache.get(this.cacheKey);
    const cachedData = cacheEntity?.get(key);
    return cachedData;
  };

  delete = (): void => {
    const cacheEntity = this.builderConfig.cache.get(this.cacheKey);
    if (cacheEntity) {
      CACHE_EVENTS.revalidate(this.cacheKey);
      cacheEntity.clear();
    }
  };

  mount = (): void => {
    const cacheEntity = this.builderConfig.cache.get(this.cacheKey);
    if (!cacheEntity) {
      const newCacheData: CacheStoreValueType = new Map();
      this.builderConfig.cache.set(this.cacheKey, newCacheData);
    }
  };
}
