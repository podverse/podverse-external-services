import { config } from './index';

export const getWebBaseUrl = (): string => {
  return `${config.web.protocol}://${config.web.host}`;
}

export const getWebBaseUrlWithPath = (path: string): string => {
  const baseUrl = getWebBaseUrl();
  return `${baseUrl}${path}`;
}

export const getWebIconImageUrl = (): string => {
  return `${getWebBaseUrl()}/${config.web.icon_image_url}`;
}
