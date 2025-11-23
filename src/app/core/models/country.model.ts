export interface Country {
  countryId?: number;
  name?: string;
  description?: string;
  isoCode?: string;
  timezone?: string;
  lang?: string;
  currency?: string;
}

export interface CountryCreateRequest {
  name: string;
  description?: string;
  isoCode?: string;
  timezone?: string;
  lang?: string;
  currency?: string;
}

export interface CountryUpdateRequest {
  countryId: number;
  name?: string;
  description?: string;
  isoCode?: string;
  timezone?: string;
  lang?: string;
  currency?: string;
}

export interface CountryQueryParams {
  countryId?: number;
  description?: string;
}

