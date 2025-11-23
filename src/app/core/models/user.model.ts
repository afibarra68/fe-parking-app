export interface User {
  appUserId?: number;
  numberIdentity: string;
  firstName: string;
  lastName: string;
  secondName?: string;
  secondLastname?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  companyName?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCreateRequest {
  numberIdentity: string;
  firstName: string;
  lastName: string;
  secondName?: string;
  secondLastname?: string;
  email?: string;
  phone?: string;
  accesKey: string;
}

export interface UserUpdateRequest {
  appUserId: number;
  numberIdentity: string;
  firstName: string;
  lastName: string;
  secondName?: string;
  secondLastname?: string;
  email?: string;
  phone?: string;
  active?: boolean;
}

export interface UserQueryParams {
  appUserId?: number;
  numberIdentity?: string;
  email?: string;
  active?: boolean;
}

export interface UserCreatedResponse {
  appUserId: number;
  numberIdentity: string;
  firstName: string;
  lastName: string;
  message?: string;
}

