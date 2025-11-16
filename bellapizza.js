 /* Unified FRONT + API backend (FastAPI)
   Agora integrado ao backend real:
   - Registro: POST /auth/register
   - Login: POST /auth/login
   - Pizzas: GET /pizzas
   - Carrinho: GET/POST /cart
   - Checkout: POST /checkout
*/

const API_URL = "http://localhost:8000";

// =========================================================
// HELPERS
// =========================================================
function getToken() {
  return localStorage.getItem("token") || null;
}

function isLogged() {
  return !!getToken();
}

function authHeaders() {
  return {
    Authorization: "Bearer " + getToken()
  };
}

// =========================================================
// ON LOAD
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  initAddButtons();
  initFilters();
  initLoginForms();
  initRegisterForms();
  loadMenuIfNeeded();
  initCartPage();
  initHeaderActions();
});

// =========================================================
// CARREGAR CARDÁPIO DO BACKEND
// =========================================================
async function loadMenuIfNeeded() {
  const container = document.querySelector("#products-container");
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/pizzas`);
    const pizzas = await res.json();

    container.innerHTML = "";

    pizzas.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.dataset.cat = p.category_id;

      card.innerHTML = `
        <img src="${API_URL}${p.image_path || ''}" alt="">
        <h3>${p.name}</h3>
        <p>${p.description || ""}</p>
        <span class="price">R$ ${p.price.toFixed(2)}</span>
        <button class="btn-add" 
            data-id="${p.id}" 
            data-name="${p.name}"
            data-price="${p.price}" 
            data-img="${API_URL}${p.image_path || ''}">
            Adicionar
        </button>
      `;

      container.appendChild(card);
    });

    initAddButtons();
  } catch (err) {
    console.error(err);
  }
}

// =========================================================
// CARRINHO LOCAL (Frontend)
// =========================================================
function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((s, it) => s + (it.qty || 1), 0);
  document.querySelectorAll("#cart-count").forEach(e => (e.textContent = count));
}

// =========================================================
// ADD TO CART (LOCAL + API)
// =========================================================
function initAddButtons() {
  const addBtns = document.querySelectorAll(".btn-add, .add-to-cart");

  addBtns.forEach(btn => {
    btn.onclick = async e => {
      e.preventDefault();

      const pizzaId = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const img = btn.dataset.img;

      if (isLogged()) {
        await fetch(`${API_URL}/cart/add`, {
          method: "POST",
          headers: { ...authHeaders() },
          body: new URLSearchParams({ pizza_id: pizzaId, quantity: 1 })
        });
      }

      const cart = getCart();
      const item = cart.find(i => i.name === name);

      if (item) item.qty++;
      else cart.push({ name, price, img, qty: 1 });

      saveCart(cart);
      showToast(`${name} adicionada ao carrinho!`);
    };
  });
}

// =========================================================
// FILTROS VISUAIS
// =========================================================
function initFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const cat = btn.dataset.cat;
      const cards = document.querySelectorAll(".product-card");

      cards.forEach(card => {
        if (cat === "todas" || card.dataset.cat === cat)
          card.style.display = "";
        else card.style.display = "none";
      });
    };
  });
}

// =========================================================
// LOGIN → BACKEND
// =========================================================
function initLoginForms() {
  const loginForm = document.getElementById("loginForm");
  const msg = document.getElementById("login-message");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async e => {
    e.preventDefault();

    const username = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPass").value;

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username,
          password
        })
      });

      if (!res.ok) {
        showInline(msg, "Credenciais inválidas!");
        return;
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);

      showInline(msg, "Login OK!");
      setTimeout(() => (window.location.href = "cardapio.html"), 800);

    } catch (err) {
      showInline(msg, "Erro no servidor.");
    }
  });
}

// =========================================================
// REGISTRO → BACKEND
// =========================================================
function initRegisterForms() {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("login-message");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        body: new FormData(form)
      });

      if (!res.ok) {
        showInline(msg, "Erro ao criar conta!");
        return;
      }

      showInline(msg, "Conta criada!");
    } catch (err) {
      showInline(msg, "Erro no servidor.");
    }
  });
}

// =========================================================
// CARRINHO (PÁGINA CART)
// =========================================================
function initCartPage() {
  const container = document.getElementById("cart-items");
  if (!container) return;

  async function syncCartWithAPI() {
    if (!isLogged()) return;

    const local = getCart();

    for (const item of local) {
      await fetch(`${API_URL}/cart/add`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: new URLSearchParams({
          pizza_id: item.id || 1,
          quantity: item.qty
        })
      });
    }

    saveCart([]);
  }

  async function render() {
    await syncCartWithAPI();

    const cart = getCart();
    container.innerHTML = "";

    if (!cart.length) {
      container.innerHTML = "<p>Seu carrinho está vazio.</p>";
      document.getElementById("cart-subtotal").textContent = "R$ 0,00";
      updateCartCount();
      return;
    }

    cart.forEach((item, i) => {
      const div = document.createElement("div");
      div.className = "cart-item";

      div.innerHTML = `
        <img src="${item.img}" alt="">
        <div class="meta">
          <h4>${item.name}</h4>
          <p>R$ ${item.price.toFixed(2)}</p>

          <div class="actions">
            <input type="number" min="1" value="${item.qty}" data-index="${i}" class="qty-input">
            <button class="btn white remove-item" data-index="${i}">Remover</button>
          </div>
        </div>
      `;

      container.appendChild(div);
    });

    const subtotal = cart.reduce((t, it) => t + it.price * it.qty, 0);
    document.getElementById("cart-subtotal").textContent =
      "R$ " + subtotal.toFixed(2).replace(".", ",");

    document.querySelectorAll(".remove-item").forEach(btn => {
      btn.onclick = () => {
        const c = getCart();
        c.splice(btn.dataset.index, 1);
        saveCart(c);
        render();
      };
    });

    document.querySelectorAll(".qty-input").forEach(inp => {
      inp.onchange = () => {
        let v = parseInt(inp.value);
        if (v < 1) v = 1;

        const c = getCart();
        c[inp.dataset.index].qty = v;
        saveCart(c);
        render();
      };
    });
  }

  document.getElementById("clear-cart").onclick = () => {
    if (confirm("Limpar carrinho?")) {
      saveCart([]);
      render();
    }
  };

  document.getElementById("checkout-btn").onclick = async () => {
    if (!isLogged()) {
      showToast("Faça login para finalizar o pedido!");
      return;
    }

    await fetch(`${API_URL}/checkout`, {
      method: "POST",
      headers: authHeaders(),
      body: new URLSearchParams({ address: "Endereço qualquer" })
    });

    saveCart([]);
    render();
    showToast("Pedido Finalizado!");
  };

  render();
}

// =========================================================
// HEADER — BOTÃO ATUALIZADO AQUI!!
// =========================================================
function initHeaderActions() {
  const btn = document.getElementById("btn-fazer-pedido");
  if (btn) {
    btn.onclick = () => {
      // 🔥 AGORA VAI PARA SUA PÁGINA DE LOGIN
      window.location.href = "loginbellapizza.html";
    };
  }
}

// =========================================================
// TOAST
// =========================================================
function showToast(text) {
  const t = document.createElement("div");
  t.textContent = text;
  t.style.position = "fixed";
  t.style.top = "20px";
  t.style.left = "50%";
  t.style.transform = "translateX(-50%)";
  t.style.background = "#2f1d18";
  t.style.color = "#fff";
  t.style.padding = "10px 16px";
  t.style.borderRadius = "999px";
  t.style.zIndex = "9999";
  t.style.transition = "0.3s";
  document.body.appendChild(t);

  setTimeout(() => (t.style.opacity = "0"), 2000);
  setTimeout(() => t.remove(), 2300);
}
