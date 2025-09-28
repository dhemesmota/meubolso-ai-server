-- Inserir categorias iniciais
INSERT INTO categories (name) VALUES 
('Alimentação'),
('Transporte'),
('Moradia'),
('Lazer'),
('Saúde')
ON CONFLICT (name) DO NOTHING;
