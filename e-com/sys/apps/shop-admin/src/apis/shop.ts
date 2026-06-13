import { get } from './http';

export const shopApi = {
  health: () => get('/health/shop'),
};
