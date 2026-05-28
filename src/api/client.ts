import type { ApiResult, UploadFile } from './types';

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: QueryParams;
  pathParams?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  formData?: FormData;
  skipAuth?: boolean;
  absoluteUrl?: boolean;
};

const DEFAULT_API_BASE_URL = 'http://120.79.247.123:8080';

let apiBaseUrl = DEFAULT_API_BASE_URL;
let authToken = '';

export const setApiBaseUrl = (baseUrl: string) => {
  apiBaseUrl = baseUrl.replace(/\/+$/, '');
};

export const getApiBaseUrl = () => apiBaseUrl;

export const setAuthToken = (token?: string | null) => {
  authToken = token || '';
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = '';
};

export const getAuthHeaders = (): Record<string, string> =>
  authToken ? { authentication: authToken } : {};

const encodeQuery = (params?: QueryParams) => {
  if (!params) return '';

  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');

  return search ? `?${search}` : '';
};

const applyPathParams = (path: string, params?: QueryParams) => {
  if (!params) return path;

  return Object.entries(params).reduce((nextPath, [key, value]) => {
    if (value === undefined || value === null) return nextPath;
    return nextPath.replace(`{${key}}`, encodeURIComponent(String(value)));
  }, path);
};

export const buildApiUrl = (
  path: string,
  query?: QueryParams,
  pathParams?: QueryParams,
) => `${apiBaseUrl}${applyPathParams(path, pathParams)}${encodeQuery(query)}`;

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { absoluteUrl, body, formData, headers, method = 'GET', query, pathParams } = options;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (!options.skipAuth && authToken) {
    requestHeaders.authentication = authToken;
  }

  const init: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (formData) {
    init.body = formData as never;
  } else if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const url = absoluteUrl ? `${path}${encodeQuery(query)}` : buildApiUrl(path, query, pathParams);
  const response = await fetch(url, init);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'msg' in payload
        ? String((payload as { msg?: string }).msg)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export const assertSuccess = <T>(result: ApiResult<T>) => {
  if (typeof result.code === 'number' && result.code !== 1) {
    throw new Error(result.msg || '接口请求失败');
  }

  return result.data;
};

export const createUploadFile = (
  file: string | UploadFile,
  fallbackName: string,
): UploadFile => {
  if (typeof file !== 'string') {
    return {
      uri: file.uri,
      name: file.name || fallbackName,
      type: file.type || 'image/jpeg',
    };
  }

  const guessedName = file.split('/').pop() || fallbackName;
  return {
    uri: file,
    name: guessedName,
    type: 'image/jpeg',
  };
};

export const appendFile = (
  formData: FormData,
  key: string,
  file: string | UploadFile,
  fallbackName: string,
) => {
  formData.append(key, createUploadFile(file, fallbackName) as unknown as Blob);
};
