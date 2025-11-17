import axios, { AxiosInstance } from 'axios';

const DEFAULT_BASE_URL = 'https://pokeapi.co/api/v2';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface PokeApiNamedResource {
  name: string;
  url: string;
}

export interface PokeApiListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokeApiNamedResource[];
}

export interface PokeApiTypeResponse {
  id: number;
  name: string;
  names: Array<{ language: PokeApiNamedResource; name: string }>;
  damage_relations: {
    no_damage_to: PokeApiNamedResource[];
    half_damage_to: PokeApiNamedResource[];
    double_damage_to: PokeApiNamedResource[];
    no_damage_from: PokeApiNamedResource[];
    half_damage_from: PokeApiNamedResource[];
    double_damage_from: PokeApiNamedResource[];
  };
}

export interface PokeApiPokemonResponse {
  id: number;
  name: string;
  names?: Array<{ language: PokeApiNamedResource; name: string }>;
  stats: Array<{
    base_stat: number;
    stat: PokeApiNamedResource;
  }>;
  types: Array<{
    slot: number;
    type: PokeApiNamedResource;
  }>;
}

export interface PokeApiPokemonSpeciesResponse {
  id: number;
  name: string;
  names: Array<{ language: PokeApiNamedResource; name: string }>;
}

export interface PokeApiMoveResponse {
  id: number;
  name: string;
  names: Array<{ language: PokeApiNamedResource; name: string }>;
  type: PokeApiNamedResource;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  power: number | null;
  damage_class: PokeApiNamedResource;
  effect_entries: Array<{
    effect: string;
    short_effect: string;
    language: PokeApiNamedResource;
  }>;
}

export interface PokeApiAbilityResponse {
  id: number;
  name: string;
  names: Array<{ language: PokeApiNamedResource; name: string }>;
  effect_entries: Array<{
    effect: string;
    short_effect: string;
    language: PokeApiNamedResource;
  }>;
}

export interface PokeApiClientOptions {
  baseURL?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class PokeApiClient {
  private readonly http: AxiosInstance;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(options?: PokeApiClientOptions) {
    this.http = axios.create({
      baseURL: options?.baseURL ?? DEFAULT_BASE_URL,
      timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

  async fetchTypeList(limit = 100, offset = 0): Promise<PokeApiListResponse> {
    return this.fetchList(`/type`, limit, offset);
  }

  async fetchPokemonList(limit = 100, offset = 0): Promise<PokeApiListResponse> {
    return this.fetchList(`/pokemon`, limit, offset);
  }

  async fetchMoveList(limit = 100, offset = 0): Promise<PokeApiListResponse> {
    return this.fetchList(`/move`, limit, offset);
  }

  async fetchAbilityList(limit = 100, offset = 0): Promise<PokeApiListResponse> {
    return this.fetchList(`/ability`, limit, offset);
  }

  async fetchType(identifier: number | string): Promise<PokeApiTypeResponse> {
    return this.fetchResource(`/type/${identifier}`);
  }

  async fetchPokemon(
    identifier: number | string,
  ): Promise<PokeApiPokemonResponse> {
    return this.fetchResource(`/pokemon/${identifier}`);
  }

  async fetchPokemonSpecies(
    identifier: number | string,
  ): Promise<PokeApiPokemonSpeciesResponse> {
    return this.fetchResource(`/pokemon-species/${identifier}`);
  }

  async fetchMove(identifier: number | string): Promise<PokeApiMoveResponse> {
    return this.fetchResource(`/move/${identifier}`);
  }

  async fetchAbility(
    identifier: number | string,
  ): Promise<PokeApiAbilityResponse> {
    return this.fetchResource(`/ability/${identifier}`);
  }

  private async fetchList(
    endpoint: string,
    limit: number,
    offset: number,
  ): Promise<PokeApiListResponse> {
    return this.fetchResource(
      `${endpoint}?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
    );
  }

  private async fetchResource<T>(endpoint: string): Promise<T> {
    return this.requestWithRetry(async () => {
      const response = await this.http.get<T>(endpoint);
      return response.data;
    });
  }

  private async requestWithRetry<T>(
    fn: () => Promise<T>,
    attempt = 0,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }
      const delay =
        this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 250;
      await sleep(delay);
      return this.requestWithRetry(fn, attempt + 1);
    }
  }
}

