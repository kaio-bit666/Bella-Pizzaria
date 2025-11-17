import os
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# -------------------------------------------------------------------
# 1. CONFIGURAÇÃO FLASK + STATIC + TEMPLATES
# -------------------------------------------------------------------

app = Flask(__name__,
            static_folder="static",
            template_folder="templates")

CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'bella_pizzaria.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['JWT_SECRET_KEY'] = 'SUA_CHAVE_SUPER_SECRETA_TROQUE_AQUI'

db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

# -------------------------------------------------------------------
# 2. MODELOS DO BANCO
# -------------------------------------------------------------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    cart_items = db.relationship('CartItem', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Pizza(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    
    # AGORA A IMAGEM USA O MESMO NOME DO FRONT
    image_filename = db.Column(db.String(255), nullable=True)

    category_id = db.Column(db.String(50), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "image_path": f"/static/{self.image_filename}" if self.image_filename else "",
            "category_id": self.category_id
        }


class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    pizza_id = db.Column(db.Integer, db.ForeignKey('pizza.id'))

    user = db.relationship('User', back_populates='cart_items')
    pizza = db.relationship('Pizza')

    def to_dict(self):
        return {
            "id": self.id,
            "quantity": self.quantity,
            "pizza": self.pizza.to_dict()
        }

# -------------------------------------------------------------------
# 3. ROTAS PRINCIPAIS
# -------------------------------------------------------------------

@app.route('/')
def home():
    return "API da Pizzaria está no ar! 🍕"


# ------------------ AUTENTICAÇÃO ------------------

@app.route('/auth/register', methods=['POST'])
def register():
    data = request.form
    name = data.get("name").strip()
    email = data.get("email").strip()
    password = data.get("password").strip()

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email já cadastrado"}), 400

    user = User(name=name, email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Usuário criado!"}), 201


@app.route('/auth/login', methods=['POST'])
def login():
    data = request.form
    email = data.get("username").strip()
    password = data.get("password").strip()

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Credenciais inválidas"}), 401

    token = create_access_token(identity={"id": user.id, "email": user.email})
    return jsonify(access_token=token), 200


# ------------------ PIZZAS ------------------

@app.route('/pizzas', methods=['GET'])
def get_pizzas():
    pizzas = Pizza.query.all()
    return jsonify([p.to_dict() for p in pizzas]), 200


# ------------------ CARRINHO ------------------

@app.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
    uid = get_jwt_identity()['id']
    user = User.query.get(uid)

    items = [i.to_dict() for i in user.cart_items.all()]
    total = sum(i['pizza']['price'] * i['quantity'] for i in items)

    return jsonify(items=items, total=total), 200


@app.route('/cart/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    uid = get_jwt_identity()['id']
    pizza_id = int(request.form.get("pizza_id"))
    qty = int(request.form.get("quantity", 1))

    item = CartItem.query.filter_by(user_id=uid, pizza_id=pizza_id).first()

    if item:
        item.quantity += qty
    else:
        item = CartItem(user_id=uid, pizza_id=pizza_id, quantity=qty)
        db.session.add(item)

    db.session.commit()
    return jsonify(item.to_dict()), 201


@app.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    uid = get_jwt_identity()['id']
    CartItem.query.filter_by(user_id=uid).delete()
    db.session.commit()
    return jsonify({"message": "Pedido finalizado!"}), 200


# -------------------------------------------------------------------
# 4. POPULAR BANCO COM PIZZAS + IMAGENS
# -------------------------------------------------------------------

def seed():
    if Pizza.query.count() == 0:
        pizzas = [
            ("Margherita", "Molho de tomate, mussarela e manjericão", 45.90, "pizza margherita.jpeg", "tradicionais"),
            ("Calabresa", "Calabresa fatiada, cebola e azeitonas", 48.90, "calabresa.jpeg", "tradicionais"),
            ("Portuguesa", "Presunto, ovos, cebola, mussarela e azeitonas", 52.90, "portuguesa.jpeg", "especiais"),
            ("Quatro Queijos", "Vários queijos deliciosos", 55.90, "quatro queijos.jpeg", "especiais"),
            ("Frango Catupiry", "Frango desfiado com catupiry", 51.90, "frango com catupiry.jpeg", "especiais"),
            ("Pepperoni", "Pepperoni italiano e mussarela", 58.90, "pepperoni.jpeg", "especiais"),
            ("Vegetariana", "Ingredientes naturais", 49.90, "vegetariana.jpeg", "vegetarianas"),
            ("Napolitana", "Mussarela, tomate e parmesão", 47.90, "pizza napolitana.jpeg", "tradicionais")
        ]

        for name, desc, price, img, cat in pizzas:
            db.session.add(Pizza(name=name, description=desc, price=price, image_filename=img, category_id=cat))

        db.session.commit()
        print("🍕 Pizzas inseridas no banco!")

# -------------------------------------------------------------------
# 5. RODAR
# -------------------------------------------------------------------

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        seed()

    app.run(debug=True, port=8000)