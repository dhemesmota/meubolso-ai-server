import { Injectable } from '@nestjs/common';
import { Category, CreateCategoryDto } from '../../common/interfaces/category.interface';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class CategoriesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(): Promise<Category[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Error fetching categories: ${error.message}`);
    }

    return data || [];
  }

  async findById(id: string): Promise<Category | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error finding category: ${error.message}`);
    }

    return data;
  }

  async findByName(name: string): Promise<Category | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .ilike('name', name)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error finding category: ${error.message}`);
    }

    return data;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .insert([createCategoryDto])
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating category: ${error.message}`);
    }

    return data;
  }

  async seedInitialCategories(): Promise<void> {
    const initialCategories = [
      'Alimentação',
      'Transporte', 
      'Moradia',
      'Lazer',
      'Saúde'
    ];

    for (const categoryName of initialCategories) {
      const existing = await this.findByName(categoryName);
      if (!existing) {
        await this.create({ name: categoryName });
      }
    }
  }
}
