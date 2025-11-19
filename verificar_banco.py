#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'backend', 'bella_pizzaria.db')

def verificar_banco():
    """Verifica o banco de dados"""
    if not os.path.exists(db_path):
        print("❌ Banco não encontrado em:", db_path)
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("🍕 VERIFICAÇÃO DO BANCO DE DADOS - BELLA PIZZARIA")
    print("=" * 60)
    
    # Tabelas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tabelas = cursor.fetchall()
    print(f"\n📋 Tabelas encontradas: {len(tabelas)}")
    for tabela in tabelas:
        print(f"   ✓ {tabela[0]}")
    
    # Pizzas
    print("\n🍕 PIZZAS NO BANCO:")
    cursor.execute("SELECT id, name, price, image_filename FROM pizza;")
    pizzas = cursor.fetchall()
    if pizzas:
        print(f"   Total: {len(pizzas)}")
        for pid, name, price, img in pizzas:
            print(f"   {pid}. {name} - R${price} ({img})")
    else:
        print("   ⚠️  Nenhuma pizza no banco")
    
    # Usuários
    print("\n👥 USUÁRIOS CADASTRADOS:")
    cursor.execute("SELECT id, name, email, password_hash FROM user;")
    users = cursor.fetchall()
    if users:
        print(f"   Total: {len(users)}")
        for uid, name, email, pwd_hash in users:
            pwd_masked = pwd_hash[:25] + "..." if len(pwd_hash) > 25 else pwd_hash
            # Verificar se está criptografado (começa com pbkdf2: ou scrypt:)
            is_hashed = "✓ CRIPTOGRAFADA" if (pwd_hash.startswith("pbkdf2:") or pwd_hash.startswith("scrypt:")) else "❌ TEXTO PLANO!"
            print(f"   {uid}. {name} ({email})")
            print(f"      Senha: {pwd_masked} {is_hashed}")
    else:
        print("   ⚠️  Nenhum usuário cadastrado")
    
    # Carrinhos
    print("\n🛒 ITENS NO CARRINHO:")
    cursor.execute("""
        SELECT ci.id, u.name, p.name, ci.quantity 
        FROM cart_item ci
        JOIN user u ON ci.user_id = u.id
        JOIN pizza p ON ci.pizza_id = p.id;
    """)
    carrinho = cursor.fetchall()
    if carrinho:
        print(f"   Total: {len(carrinho)}")
        for cid, user, pizza, qty in carrinho:
            print(f"   {cid}. {user} → {pizza} (qtd: {qty})")
    else:
        print("   ⚠️  Carrinho vazio")
    
    print("\n" + "=" * 60)
    conn.close()

if __name__ == "__main__":
    verificar_banco()
