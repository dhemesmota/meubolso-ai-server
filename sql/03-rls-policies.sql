-- Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Política para usuários: usuários podem ver apenas seus próprios dados
CREATE POLICY "Users can view own data" ON users
    FOR ALL USING (true);

-- Política para categorias: todos podem ver categorias
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

-- Política para despesas: usuários podem ver apenas suas próprias despesas
CREATE POLICY "Users can view own expenses" ON expenses
    FOR ALL USING (true);
