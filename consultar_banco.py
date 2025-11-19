#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'bella_pizzaria.db')

def conectar():
    """Conecta ao banco de dados"""
    if not os.path.exists(db_path):
        print("❌ Banco não encontrado!")
        return None
    return sqlite3.connect(db_path)

def menu_principal():
    """Menu interativo"""
    while True:
        print("\n" + "="*60)
        print("🍕 CONSULTAR BANCO DE DADOS - BELLA PIZZARIA")
        print("="*60)
        print("\n1️⃣  Ver todas as PIZZAS")
        print("2️⃣  Ver todos os USUÁRIOS")
        print("3️⃣  Ver CARRINHOS")
        print("4️⃣  Ver ESTATÍSTICAS")
        print("5️⃣  Executar SQL customizado")
        print("0️⃣  SAIR")
        
        opcao = input("\nEscolha uma opção: ").strip()
        
        if opcao == "1":
            ver_pizzas()
        elif opcao == "2":
            ver_usuarios()
        elif opcao == "3":
            ver_carrinhos()
        elif opcao == "4":
            ver_stats()
        elif opcao == "5":
            sql_customizado()
        elif opcao == "0":
            print("\n✅ Até logo!")
            break
        else:
            print("❌ Opção inválida!")

def ver_pizzas():
    """Mostra todas as pizzas"""
    conn = conectar()
    if not conn:
        return
    
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, description, price, image_filename, category_id FROM pizza;")
    pizzas = cursor.fetchall()
    
    print("\n" + "="*60)
    print("🍕 PIZZAS CADASTRADAS")
    print("="*60)
    
    if pizzas:
        for pid, name, desc, price, img, cat in pizzas:
            print(f"\n📍 ID: {pid}")
            print(f"   Nome: {name}")
            print(f"   Descrição: {desc}")
            print(f"   Preço: R$ {price:.2f}")
            print(f"   Imagem: {img}")
            print(f"   Categoria: {cat}")
    else:
        print("⚠️  Nenhuma pizza cadastrada!")
    
    conn.close()

def ver_usuarios():
    """Mostra todos os usuários"""
    conn = conectar()
    if not conn:
        return
    
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM user;")
    usuarios = cursor.fetchall()
    
    print("\n" + "="*60)
    print("👥 USUÁRIOS CADASTRADOS")
    print("="*60)
    
    if usuarios:
        for uid, name, email in usuarios:
            print(f"\n📍 ID: {uid}")
            print(f"   Nome: {name}")
            print(f"   Email: {email}")
    else:
        print("⚠️  Nenhum usuário cadastrado!")
    
    conn.close()

def ver_carrinhos():
    """Mostra itens nos carrinhos"""
    conn = conectar()
    if not conn:
        return
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ci.id, u.name, p.name, ci.quantity, (p.price * ci.quantity) as subtotal
        FROM cart_item ci
        JOIN user u ON ci.user_id = u.id
        JOIN pizza p ON ci.pizza_id = p.id
        ORDER BY u.name;
    """)
    carrinhos = cursor.fetchall()
    
    print("\n" + "="*60)
    print("🛒 ITENS NOS CARRINHOS")
    print("="*60)
    
    if carrinhos:
        total_geral = 0
        for cid, user, pizza, qty, subtotal in carrinhos:
            print(f"\n📍 ID Carrinho: {cid}")
            print(f"   Usuário: {user}")
            print(f"   Pizza: {pizza}")
            print(f"   Quantidade: {qty}")
            print(f"   Subtotal: R$ {subtotal:.2f}")
            total_geral += subtotal
        print(f"\n💰 TOTAL GERAL: R$ {total_geral:.2f}")
    else:
        print("⚠️  Carrinhos vazios!")
    
    conn.close()

def ver_stats():
    """Mostra estatísticas gerais"""
    conn = conectar()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    # Contadores
    cursor.execute("SELECT COUNT(*) FROM pizza;")
    total_pizzas = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM user;")
    total_usuarios = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM cart_item;")
    total_carrinhos = cursor.fetchone()[0]
    
    # Valores
    cursor.execute("SELECT AVG(price) FROM pizza;")
    media_preco = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT SUM(p.price * ci.quantity) FROM cart_item ci JOIN pizza p ON ci.pizza_id = p.id;")
    total_valor = cursor.fetchone()[0] or 0
    
    # Pizza mais cara
    cursor.execute("SELECT name, price FROM pizza ORDER BY price DESC LIMIT 1;")
    pizza_mais_cara = cursor.fetchone()
    
    # Pizza mais barata
    cursor.execute("SELECT name, price FROM pizza ORDER BY price ASC LIMIT 1;")
    pizza_mais_barata = cursor.fetchone()
    
    print("\n" + "="*60)
    print("📊 ESTATÍSTICAS DO BANCO")
    print("="*60)
    print(f"\n🍕 Total de Pizzas: {total_pizzas}")
    print(f"👥 Total de Usuários: {total_usuarios}")
    print(f"🛒 Itens no Carrinho: {total_carrinhos}")
    print(f"\n💰 Preço Médio: R$ {media_preco:.2f}")
    print(f"💰 Valor Total nos Carrinhos: R$ {total_valor:.2f}")
    
    if pizza_mais_cara:
        print(f"\n🌟 Pizza Mais Cara: {pizza_mais_cara[0]} (R$ {pizza_mais_cara[1]:.2f})")
    
    if pizza_mais_barata:
        print(f"💰 Pizza Mais Barata: {pizza_mais_barata[0]} (R$ {pizza_mais_barata[1]:.2f})")
    
    conn.close()

def sql_customizado():
    """Executa SQL customizado"""
    print("\n" + "="*60)
    print("🔧 SQL CUSTOMIZADO")
    print("="*60)
    print("\nTábelas disponíveis: pizza, user, cart_item")
    print("Digite 'sair' para voltar\n")
    
    conn = conectar()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    while True:
        sql = input("SQL> ").strip()
        
        if sql.lower() == "sair":
            break
        
        if not sql:
            continue
        
        try:
            cursor.execute(sql)
            
            # Se for SELECT, mostra resultados
            if sql.upper().startswith("SELECT"):
                resultados = cursor.fetchall()
                colunas = [desc[0] for desc in cursor.description]
                
                print("\n" + "="*60)
                print(" | ".join(colunas))
                print("="*60)
                
                for row in resultados:
                    print(" | ".join(str(v) for v in row))
                
                print("="*60 + "\n")
            else:
                conn.commit()
                print("✅ Comando executado com sucesso!\n")
        
        except Exception as e:
            print(f"❌ Erro: {e}\n")
    
    conn.close()

if __name__ == "__main__":
    try:
        menu_principal()
    except KeyboardInterrupt:
        print("\n\n⚠️  Programa interrompido!")
