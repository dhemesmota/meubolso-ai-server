export interface User {
  id: string;
  phone: string;
  name?: string;
  created_at: string;
}

export interface CreateUserDto {
  phone: string;
  name?: string;
}
