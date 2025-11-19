"""
BELLA PIZZARIA - Backend Completo com Banco de Dados
Porta: 8000
Banco: SQLite com SQLAlchemy
Autenticação: JWT
"""

import os
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# -------------------------------------------------------------------
# 1. CONFIGURAÇÃO FLASK
# -------------------------------------------------------------------

basedir = os.path.abspath(os.path.dirname(__file__))
frontend_folder = os.path.join(os.path.dirname(basedir), 'frontend')

app = Flask(__name__, 
            static_folder="static",
            template_folder=frontend_folder,
            static_url_path='/backend-static')
CORS(app)

# Configurar logging - LOGS DE REQUISIÇÕES HABILITADOS
import sys
log = logging.getLogger('werkzeug')
log.setLevel(logging.INFO)  # Mostrar requisições HTTP no terminal

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'bella_pizzaria.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'pizzaria-delicia-secret-key-2025'

db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

# -------------------------------------------------------------------
# 2. MODELOS DO BANCO DE DADOS
# -------------------------------------------------------------------

class User(db.Model):
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    cart_items = db.relationship('CartItem', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email
        }


class Pizza(db.Model):
    __tablename__ = 'pizza'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_filename = db.Column(db.String(255), nullable=True)
    category_id = db.Column(db.String(50), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "image_path": f"/static/img/{self.image_filename}" if self.image_filename else "/static/img/pizza-default.jpg",
            "category_id": self.category_id
        }


class CartItem(db.Model):
    __tablename__ = 'cart_item'
    
    id = db.Column(db.Integer, primary_key=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pizza_id = db.Column(db.Integer, db.ForeignKey('pizza.id'), nullable=False)

    user = db.relationship('User', back_populates='cart_items')
    pizza = db.relationship('Pizza')

    def to_dict(self):
        return {
            "id": self.id,
            "quantity": self.quantity,
            "pizza": self.pizza.to_dict()
        }


# -------------------------------------------------------------------
# 3. ROTAS - HOME
# -------------------------------------------------------------------

@app.route('/api')
def api_info():
    return jsonify({
        "message": "🍕 Bella Pizzaria API está funcionando!",
        "version": "2.0",
        "endpoints": {
            "auth": ["/auth/register", "/auth/login"],
            "pizzas": ["/pizzas"],
            "cart": ["/cart", "/cart/add", "/cart/remove"],
            "checkout": ["/checkout"]
        }
    }), 200


# -------------------------------------------------------------------
# 4. ROTAS - AUTENTICAÇÃO
# -------------------------------------------------------------------

@app.route('/auth/register', methods=['POST'])
def register():
    """Criar nova conta de usuário"""
    data = request.form
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({"message": "Todos os campos são obrigatórios"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email já cadastrado"}), 400

    user = User(name=name, email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        "message": "Usuário criado com sucesso!",
        "user": user.to_dict()
    }), 201


@app.route('/auth/login', methods=['POST'])
def login():
    """Fazer login e receber token JWT"""
    data = request.form
    email = data.get("username", "").strip()  # Frontend envia como 'username'
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"message": "Email e senha são obrigatórios"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Credenciais inválidas"}), 401

    token = create_access_token(identity=str(user.id))
    
    return jsonify({
        "message": "Login realizado com sucesso!",
        "access_token": token,
        "user": user.to_dict()
    }), 200


# -------------------------------------------------------------------
# 5. ROTAS - PIZZAS
# -------------------------------------------------------------------

@app.route('/pizzas', methods=['GET'])
def get_pizzas():
    """Listar todas as pizzas disponíveis"""
    pizzas = Pizza.query.all()
    return jsonify([p.to_dict() for p in pizzas]), 200


@app.route('/pizzas/<int:pizza_id>', methods=['GET'])
def get_pizza(pizza_id):
    """Buscar uma pizza específica"""
    pizza = db.session.get(Pizza, pizza_id)
    if not pizza:
        return jsonify({"message": "Pizza não encontrada"}), 404
    return jsonify(pizza.to_dict()), 200


# -------------------------------------------------------------------
# 6. ROTAS - CARRINHO
# -------------------------------------------------------------------

@app.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
    """Obter carrinho do usuário logado"""
    uid = int(get_jwt_identity())
    user = db.session.get(User, uid)

    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404

    items = [i.to_dict() for i in user.cart_items.all()]
    total = sum(i['pizza']['price'] * i['quantity'] for i in items)

    return jsonify({
        "items": items,
        "total": total,
        "count": len(items)
    }), 200


@app.route('/cart/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    """Adicionar pizza ao carrinho"""
    uid = int(get_jwt_identity())
    pizza_id = int(request.form.get("pizza_id"))
    qty = int(request.form.get("quantity", 1))

    # Verificar se a pizza existe
    pizza = Pizza.query.get(pizza_id)
    if not pizza:
        return jsonify({"message": "Pizza não encontrada"}), 404

    # Verificar se já existe no carrinho
    item = CartItem.query.filter_by(user_id=uid, pizza_id=pizza_id).first()

    if item:
        item.quantity += qty
    else:
        item = CartItem(user_id=uid, pizza_id=pizza_id, quantity=qty)
        db.session.add(item)

    db.session.commit()
    
    return jsonify({
        "message": "Item adicionado ao carrinho!",
        "item": item.to_dict()
    }), 201


@app.route('/cart/remove', methods=['POST'])
@jwt_required()
def remove_from_cart():
    """Remover pizza do carrinho"""
    uid = int(get_jwt_identity())
    pizza_id = int(request.form.get("pizza_id"))

    item = CartItem.query.filter_by(user_id=uid, pizza_id=pizza_id).first()

    if not item:
        return jsonify({"message": "Item não encontrado no carrinho"}), 404

    db.session.delete(item)
    db.session.commit()
    
    return jsonify({"message": "Item removido do carrinho!"}), 200


@app.route('/cart/clear', methods=['POST'])
@jwt_required()
def clear_cart():
    """Limpar todo o carrinho"""
    uid = int(get_jwt_identity())
    CartItem.query.filter_by(user_id=uid).delete()
    db.session.commit()
    return jsonify({"message": "Carrinho limpo!"}), 200


# -------------------------------------------------------------------
# 7. ROTAS - DADOS DO USUÁRIO
# -------------------------------------------------------------------

@app.route('/user/me', methods=['GET'])
@jwt_required()
def get_user_data():
    """Retorna dados do usuário logado para auto-completar formulários"""
    uid = int(get_jwt_identity())
    user = db.session.get(User, uid)
    
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email
    }), 200


# -------------------------------------------------------------------
# 8. ROTAS - CHECKOUT
# -------------------------------------------------------------------

@app.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    """Finalizar pedido com dados completos"""
    uid = int(get_jwt_identity())
    
    # Receber dados do JSON
    data = request.get_json()
    
    endereco = data.get("endereco", "Endereço não informado")
    pagamento = data.get("pagamento", "dinheiro")
    cpf = data.get("cpf", "")
    telefone = data.get("telefone", "")
    nome = data.get("nome", "")
    troco = data.get("troco", "Não precisa")
    observacoes = data.get("observacoes", "")

    # Buscar itens do carrinho
    items = CartItem.query.filter_by(user_id=uid).all()
    
    if not items:
        return jsonify({"error": "Carrinho vazio!"}), 400

    # Calcular total
    total = sum(item.pizza.price * item.quantity for item in items)

    # Validar CPF (11 dígitos)
    cpf_numeros = ''.join(filter(str.isdigit, cpf))
    if len(cpf_numeros) != 11:
        return jsonify({"error": "CPF inválido"}), 400

    # Aqui você poderia salvar em uma tabela 'Order' com todos os dados
    # Por enquanto, apenas limpa o carrinho após confirmar

    CartItem.query.filter_by(user_id=uid).delete()
    db.session.commit()
    
    return jsonify({
        "message": "Pedido finalizado com sucesso!",
        "total": total,
        "endereco": endereco,
        "pagamento": pagamento,
        "cpf": cpf,
        "telefone": telefone,
        "nome": nome
    }), 200


# -------------------------------------------------------------------
# 9. SERVIR ARQUIVOS ESTÁTICOS (Imagens)
# -------------------------------------------------------------------

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Servir imagens e arquivos estáticos do backend"""
    return send_from_directory(app.static_folder, filename)


# Servir arquivos do frontend (CSS, JS, imagens)
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(frontend_folder, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(frontend_folder, 'js'), filename)

@app.route('/img/<path:filename>')
def serve_img(filename):
    return send_from_directory(os.path.join(frontend_folder, 'img'), filename)

@app.route('/static/favicon.svg')
def serve_favicon_svg():
    return send_from_directory(os.path.join(frontend_folder, 'static'), 'favicon.svg')


# Rotas do frontend HTML
@app.route('/')
def index_page():
    return send_from_directory(frontend_folder, 'index.html')

@app.route('/cardapio.html')
def cardapio_page():
    return send_from_directory(frontend_folder, 'cardapio.html')

@app.route('/login.html')
def login_page():
    return send_from_directory(frontend_folder, 'login.html')

@app.route('/cadastro.html')
def cadastro_page():
    return send_from_directory(frontend_folder, 'cadastro.html')

@app.route('/carrinho.html')
def carrinho_page():
    return send_from_directory(frontend_folder, 'carrinho.html')

@app.route('/favicon.ico')
def favicon():
    """Servir favicon para evitar 404"""
    return '', 204


# -------------------------------------------------------------------
# 9. POPULAR BANCO COM DADOS INICIAIS
# -------------------------------------------------------------------

def seed_database():
    """Popular banco com pizzas iniciais"""
    
    # Verificar se já existem pizzas
    if Pizza.query.count() > 0:
        print("✅ Banco já contém pizzas!")
        return

    print("🔄 Populando banco de dados...")

    pizzas = [
        ("Margherita", "Molho de tomate, mussarela e manjericão fresco", 45.90, "pizza margherita.jpeg", "tradicionais"),
        ("Calabresa", "Calabresa fatiada, cebola roxa e azeitonas", 48.90, "calabresa.jpeg", "tradicionais"),
        ("Portuguesa", "Presunto, ovos, cebola, mussarela e azeitonas", 52.90, "portuguesa.jpeg", "tradicionais"),
        ("Quatro Queijos", "Mussarela, provolone, gorgonzola e parmesão", 55.90, "quatro queijos.jpeg", "especiais"),
        ("Frango Catupiry", "Frango desfiado com catupiry cremoso", 51.90, "frango com catupiry.jpeg", "especiais"),
        ("Pepperoni", "Pepperoni italiano e mussarela especial", 58.90, "pepperoni.jpeg", "especiais"),
        ("Vegetariana", "Tomate, pimentão, cebola, champignon e azeitonas", 49.90, "vegetariana.jpeg", "vegetarianas"),
        ("Napolitana", "Mussarela, tomate em rodelas e parmesão ralado", 47.90, "pizza napolitana.jpeg", "tradicionais")
    ]

    for name, desc, price, img, cat in pizzas:
        pizza = Pizza(
            name=name,
            description=desc,
            price=price,
            image_filename=img,
            category_id=cat
        )
        db.session.add(pizza)

    db.session.commit()
    print(f"✅ {len(pizzas)} pizzas inseridas no banco!")


# -------------------------------------------------------------------
# 10. INICIALIZAR APLICAÇÃO
# -------------------------------------------------------------------

if __name__ == "__main__":
    with app.app_context():
        # Criar todas as tabelas
        db.create_all()
        print("✅ Tabelas do banco criadas!")
        
        # Popular com dados iniciais
        seed_database()
        
        print("\n" + "="*50)
        print("🍕 BELLA PIZZARIA - API REST")
        print("="*50)
        print("🌐 Servidor: http://127.0.0.1:8000")
        print("📊 Banco: SQLite (bella_pizzaria.db)")
        print("🔐 Autenticação: JWT")
        print("✅ Sistema pronto!")
        print("="*50 + "\n")

    app.run(debug=False, port=8000, host='0.0.0.0', threaded=True)
