# 🍕 Bella Pizza - Sistema de Delivery

Sistema completo de delivery de pizzaria com checkout profissional, desenvolvido com Flask (Backend) e HTML/CSS/JavaScript (Frontend).

## 🚀 Como Executar

```powershell
cd backend
python app_bella.py
```

Acesse: **http://127.0.0.1:8000**

> O banco de dados SQLite será criado automaticamente com 8 pizzas pré-cadastradas na primeira execução.

## 📂 Estrutura do Projeto

```
pizzaria/
├── backend/
│   ├── app_bella.py              # API Flask + SQLAlchemy
│   ├── bella_pizzaria.db         # Banco SQLite (gerado automaticamente)
│   └── static/img/               # Imagens das pizzas
│
└── frontend/
    ├── index.html                # Página inicial
    ├── cardapio.html             # Cardápio com 8 pizzas
    ├── login.html                # Login
    ├── cadastro.html             # Registro com validação de senha
    ├── carrinho.html             # Carrinho + checkout 4 etapas
    ├── css/style.css             # Estilos (Georgia + Inter)
    └── js/app.js                 # JavaScript ES6+
```

## 🎯 Funcionalidades

### Front-end
- ✅ Design profissional com Bootstrap 5.3
- ✅ Tipografia padronizada (Georgia + Inter)
- ✅ Sistema de autenticação com JWT
- ✅ Validação de senha no cadastro
- ✅ Detecção automática de sessão expirada
- ✅ Carrinho de compras dinâmico
- ✅ **Checkout profissional em 4 etapas:**
  - 📋 Dados Pessoais (nome auto-preenchido, CPF, telefone)
  - 📍 Endereço (ViaCEP com auto-preenchimento)
  - 💳 Forma de Pagamento (Dinheiro, Cartão, PIX)
  - ✅ Confirmação Final (resumo completo)
- ✅ Validação de CPF brasileiro (algoritmo completo)
- ✅ Máscaras automáticas (CPF, telefone, CEP)
- ✅ Indicador visual de progresso no checkout
- ✅ Notificações toast em tempo real

### Back-end
- ✅ API RESTful com Flask 3.0
- ✅ Autenticação JWT (Flask-JWT-Extended)
- ✅ Banco SQLite + SQLAlchemy 2.0
- ✅ Hash de senhas com Werkzeug
- ✅ CORS habilitado
- ✅ Seed automático de pizzas
- ✅ Logs de requisições HTTP

## 🔌 Endpoints da API

### Autenticação
- `POST /auth/register` - Criar conta (name, email, password)
- `POST /auth/login` - Login (retorna JWT token)

### Usuário
- `GET /user/me` - Dados do usuário logado (JWT required)

### Pizzas
- `GET /pizzas` - Listar todas as pizzas
- `GET /pizzas/<id>` - Detalhes de uma pizza

### Carrinho (JWT Required)
- `GET /cart` - Ver carrinho com itens e total
- `POST /cart/add` - Adicionar pizza (pizza_id, quantity)
- `POST /cart/remove` - Remover item (pizza_id)
- `POST /cart/clear` - Limpar carrinho

### Checkout (JWT Required)
- `POST /checkout` - Finalizar pedido com dados completos:
  - endereco (string completa com CEP)
  - pagamento (dinheiro/cartao/pix)
  - cpf (validado no backend)
  - telefone
  - nome
  - troco (opcional)
  - observacoes (opcional)

## 🧪 Exemplos de Requisições

### 1. Registrar Usuário
```http
POST http://127.0.0.1:8000/auth/register
Content-Type: application/x-www-form-urlencoded

name=Maria Silva&email=maria@email.com&password=senha123
```

### 2. Login
```http
POST http://127.0.0.1:8000/auth/login
Content-Type: application/x-www-form-urlencoded

username=maria@email.com&password=senha123
```
**Resposta:** `{ "access_token": "eyJ..." }`

### 3. Adicionar ao Carrinho
```http
POST http://127.0.0.1:8000/cart/add
Authorization: Bearer eyJ...
Content-Type: application/x-www-form-urlencoded

pizza_id=1&quantity=2
```

### 4. Finalizar Pedido
```http
POST http://127.0.0.1:8000/checkout
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "endereco": "Rua das Flores, 123 - Centro, São Paulo/SP (Ref: Próximo ao mercado)",
  "pagamento": "pix",
  "cpf": "123.456.789-00",
  "telefone": "(11) 98765-4321",
  "nome": "Maria Silva",
  "troco": "Não precisa",
  "observacoes": "Sem cebola"
}
```

## 💻 Tecnologias

**Backend:**
- Flask 3.0.0
- SQLAlchemy 2.0
- Flask-JWT-Extended 4.6.0
- Werkzeug (hash de senhas)
- SQLite3

**Frontend:**
- HTML5 + CSS3
- JavaScript ES6+ (Async/Await, Fetch API)
- Bootstrap 5.3 (via CDN)
- Google Fonts (Georgia, Inter)

**APIs Externas:**
- ViaCEP (busca de endereço por CEP)

## 📊 Banco de Dados

### Tabelas
```sql
user (id, name, email, password_hash)
pizza (id, name, description, price, image_filename)
cart_item (id, quantity, user_id, pizza_id)
```

### Pizzas Pré-cadastradas
1. Pizza Margherita - R$ 35,00
2. Calabresa - R$ 38,00
3. Frango com Catupiry - R$ 42,00
4. Portuguesa - R$ 45,00
5. Quatro Queijos - R$ 48,00
6. Vegetariana - R$ 40,00
7. Pizza Napolitana - R$ 44,00
8. Pepperoni - R$ 46,00

## 🔒 Segurança

- ✅ Senhas com hash SHA-256
- ✅ Autenticação via JWT Bearer Token
- ✅ Validação de CPF no cliente e servidor
- ✅ Proteção contra sessões expiradas (auto-logout)
- ✅ Validação de dados em todas as requisições

## 🎨 Design

- Paleta de cores profissional
- Tipografia hierárquica (Georgia para títulos, Inter para corpo)
- Layout responsivo (desktop e mobile)
- Animações suaves (fade-in, slide-up)
- Indicadores visuais de progresso
- Feedback instantâneo (toasts)

---

**Desenvolvido como projeto acadêmico full-stack** | © 2025 Bella Pizza
