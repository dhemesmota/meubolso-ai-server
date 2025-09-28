import { Injectable } from '@nestjs/common';
import { CreateUserDto, User } from '../../common/interfaces/user.interface';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class UsersService {
  constructor(private supabaseService: SupabaseService) {}

  async findByPhone(phone: string): Promise<User | null> {
    // Truncar número de telefone para máximo 20 caracteres
    const truncatedPhone = phone.substring(0, 20);
    
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('*')
      .eq('phone', truncatedPhone)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error finding user: ${error.message}`);
    }

    return data;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Truncar número de telefone para máximo 20 caracteres
    const truncatedUser = {
      ...createUserDto,
      phone: createUserDto.phone.substring(0, 20)
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .insert([truncatedUser])
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }

    return data;
  }

  async findOrCreateByPhone(phone: string, name?: string): Promise<User> {
    let user = await this.findByPhone(phone);
    
    if (!user) {
      user = await this.create({ phone, name });
    }
    
    return user;
  }
}
