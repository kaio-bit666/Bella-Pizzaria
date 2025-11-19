/* ARQUIVO JAVASCRIPT FINAL E CORRIGIDO */

// Detectar automaticamente a URL base (funciona em Live Server e Flask)
const API_URL = window.location.origin.includes('5500') 
    ? "http://127.0.0.1:8000"  // Live Server
    : window.location.origin;   // Flask (mesma origem)

// =========================================================
// HELPERS (Para Login e Autorização)
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
// ON LOAD (Inicializa tudo)
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  initFilters();
  initLoginForms();
  initRegisterForms();
  loadMenuIfNeeded(); 
  initCartPage(); 
  initHeaderActions();
});

// =========================================================
// CARREGAR CARDÁPIO DO BACKEND (Sintaxe Corrigida)
// =========================================================
async function loadMenuIfNeeded() {
  const container = document.querySelector("#products-container");
  if (!container) return;

  try {
    // ✅ CORRIGIDO: Adicionado as crases
    const res = await fetch(`${API_URL}/pizzas`); 
    const pizzas = await res.json();

    container.innerHTML = "";

    pizzas.forEach(p => {
      const card = document.createElement("div");
      card.className = "pizza-card";
      card.dataset.cat = p.category_id; 

      card.innerHTML = `
        <div class="pizza-img">
          <img src="${API_URL}${p.image_path}" alt="${p.name}">
        </div>
        <h4>${p.name}</h4>
        <p>${p.description || ""}</p>
        <span class="price">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
        <button class="btn-add" onclick="adicionarAoCarrinho(${p.id})">
          Adicionar
        </button>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Erro ao carregar o menu:", err);
    container.innerHTML = "<p>Não foi possível carregar o cardápio. Verifique se o app.py está rodando.</p>";
  }
}

// =========================================================
// ADICIONAR AO CARRINHO (CORRIGIDO: Crases na mensagem)
// =========================================================
async function adicionarAoCarrinho(pizzaId) {
  // BUG FIX: Verifica login e adiciona com token JWT
  if (!isLogged()) {
    showToast("🔒 Você precisa estar logado para adicionar itens!");
    setTimeout(() => window.location.href = "login.html", 1500);
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/cart/add`, { 
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`
      }, 
      body: new URLSearchParams({ pizza_id: pizzaId, quantity: 1 })
    });
    
    // Se retornar 401, token expirou - desloga automaticamente
    if (res.status === 401) {
      localStorage.removeItem("token");
      showToast("🔒 Sessão expirada! Faça login novamente.");
      
      // Atualizar o menu visualmente para mostrar que deslogou
      const accountLink = document.getElementById("nav-account");
      if (accountLink) {
        accountLink.innerText = "Minha Conta";
        accountLink.href = "login.html";
        accountLink.onclick = null;
      }
      
      setTimeout(() => window.location.href = "login.html", 2000);
      return;
    }
    
    const data = await res.json();
    
    if(!res.ok) {
      console.error("Erro ao adicionar:", data);
      showToast(data.message || "❌ Erro ao adicionar pizza");
      return;
    }

    showToast(`✅ Pizza adicionada ao carrinho!`);
    await updateCartCount(); 

  } catch (err) {
    console.error("Erro completo:", err);
    showToast("❌ Erro ao adicionar item ao carrinho.");
  }
}

// =========================================================
// LOGIN → BACKEND (Sintaxe Corrigida)
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
      // ✅ CORRIGIDO: Adicionado as crases
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password })
      });
      if (!res.ok) {
        showInline(msg, "Credenciais inválidas!");
        return;
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      showInline(msg, "Login realizado com sucesso!");
      setTimeout(() => (window.location.href = "/cardapio.html"), 800);
    } catch (err) {
      showInline(msg, "Erro no servidor.");
    }
  });
}

// ... (O restante do código é a continuação do que você já tem, mas com a sintaxe correta) ...

function initRegisterForms() {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("login-message");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    
    // BUG FIX: Valida se as senhas coincidem
    const password = form.querySelector('[name="password"]').value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    
    if (password !== confirmPassword) {
      showInline(msg, "❌ As senhas não coincidem!");
      return;
    }
    
    if (password.length < 6) {
      showInline(msg, "❌ A senha deve ter pelo menos 6 caracteres!");
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        body: new FormData(form)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showInline(msg, data.message || "Erro ao criar conta!");
        return;
      }
      
      msg.style.color = "#27ae60";
      showInline(msg, "✅ Conta criada com sucesso!");
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1000);
    } catch (err) {
      showInline(msg, "❌ Erro no servidor.");
    }
  });
}

async function updateCartCount() {
    if (!isLogged()) {
        document.querySelectorAll("#cart-count").forEach(e => (e.style.display = 'none'));
        return;
    }
    
    try {
        // ✅ Liga para a API
        const res = await fetch(`${API_URL}/cart`, { headers: authHeaders() });
        const data = await res.json();
        
        // 🏆 CORREÇÃO FINAL: Checa se a resposta é OK e se a lista de itens existe
        if (!res.ok || !data.items) {
            document.querySelectorAll("#cart-count").forEach(e => (e.style.display = 'none'));
            return;
        }

        // Esta linha só roda se o 'data.items' for válido
        const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
        
        document.querySelectorAll("#cart-count").forEach(e => {
            if(totalItems > 0) {
                e.textContent = totalItems;
                e.style.display = 'inline-block';
            } else {
                e.style.display = 'none';
            }
        });
    } catch(err) {
        // Se der erro de rede, limpa o contador
        document.querySelectorAll("#cart-count").forEach(e => (e.style.display = 'none'));
    }
}

// BUG FIX #9: renderCart precisa ser global para removerDoCarrinho
let renderCart = null;

function initCartPage() {
  const container = document.getElementById("cart-items");
  if (!container) return; 

  const totalEl = document.getElementById("cart-subtotal");
  const clearBtn = document.getElementById("clear-cart");

  renderCart = async function() {
    if (!isLogged()) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <h3 style="color:#6f5a4f; margin-bottom:16px;">🔒 Faça login para ver seu carrinho</h3>
                <p style="color:#999; margin-bottom:20px;">Você precisa estar logado para gerenciar seu carrinho</p>
                <a href="/login.html" class="btn red">Fazer Login</a>
            </div>
        `;
        totalEl.textContent = "R$ 0,00";
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/cart`, {
            method: 'GET',
            headers: authHeaders()
        });
        
        if(!res.ok) throw new Error('Não foi possível carregar o carrinho');
        
        const data = await res.json();
        
        container.innerHTML = "";

        if (!data.items || data.items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px 20px;">
                    <h3 style="color:#6f5a4f; margin-bottom:16px;">🍕 Seu carrinho está vazio</h3>
                    <p style="color:#999; margin-bottom:20px;">Que tal adicionar algumas pizzas deliciosas?</p>
                    <a href="/cardapio.html" class="btn red">Ver Cardápio</a>
                </div>
            `;
            totalEl.textContent = "R$ 0,00";
            return;
        }

        data.items.forEach((item) => {
            const div = document.createElement("div");
            div.className = "cart-item";
            div.innerHTML = `
                <img src="${API_URL}${item.pizza.image_path}" alt="${item.pizza.name}">
                <div class="meta">
                    <h4>${item.pizza.name}</h4>
                    <p>R$ ${item.pizza.price.toFixed(2).replace('.', ',')}</p>
                    <div class="actions">
                        <p>Quantidade: ${item.quantity}</p> 
                        <button class="btn white remove-item" onclick="removerDoCarrinho(${item.pizza.id})">
                            Remover
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });

        totalEl.textContent = "R$ " + data.total.toFixed(2).replace(".", ",");
        updateCartCount(); 
        
    } catch(err) {
        console.error(err);
        container.innerHTML = "<p>Erro ao carregar seu carrinho. Tente logar novamente.</p>";
    }
  }

  if(clearBtn) {
    clearBtn.onclick = async () => {
        if (confirm("Tem certeza que deseja limpar todo o carrinho?")) {
            try {
                const res = await fetch(`${API_URL}/cart/clear`, { 
                    method: "POST", 
                    headers: authHeaders()
                });
                
                if (!res.ok) throw new Error('Erro ao limpar');
                
                showToast("Carrinho limpo com sucesso!");
                renderCart();
            } catch (err) {
                showToast("Erro ao limpar carrinho.");
            }
        }
    };
  }

  const checkoutBtn = document.getElementById("checkout-btn");
  if(checkoutBtn) {
    checkoutBtn.onclick = () => {
        if (!isLogged()) {
            showToast("Faça login para finalizar o pedido!");
            return;
        }
        abrirModalCheckout();
    };
  }

  renderCart();
}

// MODAL DE CHECKOUT COMPLETO - 4 ETAPAS
let currentStep = 1;
let checkoutData = {};

async function abrirModalCheckout() {
    const modal = document.getElementById("checkout-modal");
    
    if (!modal) {
        return;
    }
    
    // Verifica se há itens no carrinho
    try {
        const res = await fetch(`${API_URL}/cart`, { headers: authHeaders() });
        if (res.ok) {
            const data = await res.json();
            if (!data.items || data.items.length === 0) {
                showToast("❌ Seu carrinho está vazio! Adicione pizzas antes de finalizar.");
                return;
            }
            checkoutData.items = data.items;
            checkoutData.total = data.total;
        }
    } catch (err) {
        console.error("Erro ao verificar carrinho:", err);
        showToast("❌ Erro ao verificar carrinho. Tente novamente.");
        return;
    }
    
    // Buscar dados do usuário para auto-completar
    try {
        const res = await fetch(`${API_URL}/user/me`, { headers: authHeaders() });
        if (res.ok) {
            const user = await res.json();
            document.getElementById("nome-completo-input").value = user.name || "";
            document.getElementById("email-input").value = user.email || "";
        }
    } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
    }
    
    modal.style.display = "flex";
    currentStep = 1;
    mostrarEtapa(1);
    configurarCheckoutListeners();
    atualizarProgresso();
}

function fecharModalCheckout() {
    const modal = document.getElementById("checkout-modal");
    if (modal) {
        modal.style.display = "none";
        resetarFormulario();
    }
}

function resetarFormulario() {
    currentStep = 1;
    checkoutData = {};
    document.getElementById("checkout-form").reset();
    document.getElementById("endereco-fields").style.display = "none";
    mostrarEtapa(1);
    atualizarProgresso();
}

function mostrarEtapa(step) {
    // Esconder todas as etapas
    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (stepEl) stepEl.style.display = "none";
    }
    
    // Mostrar etapa atual
    const currentStepEl = document.getElementById(`step-${step}`);
    if (currentStepEl) {
        currentStepEl.style.display = "block";
        currentStepEl.style.animation = "fadeInUp 0.4s ease";
    }
    
    // Controlar botões
    const btnVoltar = document.getElementById("btn-voltar");
    const btnProximo = document.getElementById("btn-proximo");
    const btnConfirmar = document.getElementById("btn-confirmar");
    
    if (btnVoltar) btnVoltar.style.display = step > 1 ? "inline-block" : "none";
    if (btnProximo) btnProximo.style.display = step < 4 ? "inline-block" : "none";
    if (btnConfirmar) btnConfirmar.style.display = step === 4 ? "inline-block" : "none";
}

function atualizarProgresso() {
    const steps = document.querySelectorAll('.progress-steps .step');
    steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum < currentStep) {
            step.classList.add('completed');
        } else if (stepNum === currentStep) {
            step.classList.add('active');
        }
    });
}

function configurarCheckoutListeners() {
    // Máscara CPF
    const cpfInput = document.getElementById("cpf-input");
    if (cpfInput) {
        cpfInput.oninput = (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            e.target.value = value;
        };
    }
    
    // Máscara Telefone
    const telInput = document.getElementById("telefone-input");
    if (telInput) {
        telInput.oninput = (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;
        };
    }
    
    // Máscara CEP
    const cepInput = document.getElementById("cep-input");
    if (cepInput) {
        cepInput.oninput = (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) {
                value = value.slice(0, 5) + '-' + value.slice(5, 8);
            }
            e.target.value = value;
        };
        
        cepInput.onblur = () => {
            const cep = cepInput.value.replace(/\D/g, '');
            if (cep.length === 8) {
                buscarCEP(cep);
            }
        };
    }
    
    // Controle de forma de pagamento
    const paymentInputs = document.querySelectorAll('input[name="payment"]');
    const trocoSection = document.getElementById("troco-section");
    
    paymentInputs.forEach(input => {
        input.onchange = () => {
            if (trocoSection) {
                trocoSection.style.display = input.value === 'dinheiro' ? 'block' : 'none';
            }
        };
    });
    
    // Botão Próximo
    const btnProximo = document.getElementById("btn-proximo");
    if (btnProximo) {
        btnProximo.onclick = () => avancarEtapa();
    }
    
    // Botão Voltar
    const btnVoltar = document.getElementById("btn-voltar");
    if (btnVoltar) {
        btnVoltar.onclick = () => voltarEtapa();
    }
    
    // Botão Confirmar
    const btnConfirmar = document.getElementById("btn-confirmar");
    if (btnConfirmar) {
        btnConfirmar.onclick = () => finalizarPedido();
    }
}

async function avancarEtapa() {
    // Validar etapa atual antes de avançar
    if (!validarEtapaAtual()) {
        return;
    }
    
    // Salvar dados da etapa atual
    salvarDadosEtapa();
    
    // Se for etapa 3, mostrar resumo
    if (currentStep === 3) {
        mostrarResumoCompleto();
    }
    
    currentStep++;
    mostrarEtapa(currentStep);
    atualizarProgresso();
}

function voltarEtapa() {
    if (currentStep > 1) {
        currentStep--;
        mostrarEtapa(currentStep);
        atualizarProgresso();
    }
}

function validarEtapaAtual() {
    if (currentStep === 1) {
        const nome = document.getElementById("nome-completo-input").value.trim();
        const cpf = document.getElementById("cpf-input").value.replace(/\D/g, '');
        const telefone = document.getElementById("telefone-input").value.replace(/\D/g, '');
        const email = document.getElementById("email-input").value.trim();
        
        if (!nome) {
            showToast("❌ Preencha seu nome completo");
            return false;
        }
        
        if (!cpf || cpf.length !== 11) {
            showToast("❌ CPF inválido! Digite 11 dígitos.");
            return false;
        }
        
        if (!validarCPF(cpf)) {
            showToast("❌ CPF inválido! Verifique os números digitados.");
            return false;
        }
        
        if (!telefone || telefone.length < 10) {
            showToast("❌ Telefone inválido!");
            return false;
        }
        
        if (!email || !email.includes('@')) {
            showToast("❌ E-mail inválido!");
            return false;
        }
        
        return true;
    }
    
    if (currentStep === 2) {
        const cep = document.getElementById("cep-input").value.replace(/\D/g, '');
        const numero = document.getElementById("numero-input").value.trim();
        const rua = document.getElementById("rua-input").value.trim();
        
        if (!cep || cep.length !== 8) {
            showToast("❌ CEP inválido!");
            return false;
        }
        
        if (!rua) {
            showToast("❌ Aguarde o carregamento do endereço via CEP");
            return false;
        }
        
        if (!numero) {
            showToast("❌ Informe o número do endereço");
            return false;
        }
        
        return true;
    }
    
    if (currentStep === 3) {
        const payment = document.querySelector('input[name="payment"]:checked');
        if (!payment) {
            showToast("❌ Selecione uma forma de pagamento");
            return false;
        }
        return true;
    }
    
    return true;
}

function validarCPF(cpf) {
    // Remove caracteres não numéricos
    cpf = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

function salvarDadosEtapa() {
    if (currentStep === 1) {
        checkoutData.nome = document.getElementById("nome-completo-input").value.trim();
        checkoutData.cpf = document.getElementById("cpf-input").value;
        checkoutData.telefone = document.getElementById("telefone-input").value;
        checkoutData.email = document.getElementById("email-input").value.trim();
    }
    
    if (currentStep === 2) {
        const rua = document.getElementById("rua-input").value;
        const numero = document.getElementById("numero-input").value;
        const complemento = document.getElementById("complemento-input").value;
        const bairro = document.getElementById("bairro-input").value;
        const cidade = document.getElementById("cidade-input").value;
        const uf = document.getElementById("uf-input").value;
        const referencia = document.getElementById("referencia-input").value;
        
        checkoutData.endereco = `${rua}, ${numero}${complemento ? ' - ' + complemento : ''}, ${bairro}, ${cidade}/${uf}`;
        if (referencia) {
            checkoutData.endereco += ` (Ref: ${referencia})`;
        }
    }
    
    if (currentStep === 3) {
        const payment = document.querySelector('input[name="payment"]:checked');
        checkoutData.pagamento = payment ? payment.value : 'dinheiro';
        
        const troco = document.getElementById("troco-input").value;
        checkoutData.troco = troco || 'Não precisa';
        
        const obs = document.getElementById("observacoes-input").value.trim();
        checkoutData.observacoes = obs || 'Sem observações';
    }
}

async function buscarCEP(cep) {
    const status = document.getElementById("cep-status");
    status.textContent = "🔍 Buscando...";
    status.style.color = "#666";
    
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        
        if (data.erro) {
            status.textContent = "❌ CEP não encontrado";
            status.style.color = "#e63946";
            return;
        }
        
        // Preencher campos
        document.getElementById("rua-input").value = data.logradouro;
        document.getElementById("bairro-input").value = data.bairro;
        document.getElementById("cidade-input").value = data.localidade;
        document.getElementById("uf-input").value = data.uf;
        document.getElementById("endereco-fields").style.display = "block";
        
        status.textContent = "✅ Endereço encontrado!";
        status.style.color = "#27ae60";
    } catch (err) {
        status.textContent = "❌ Erro ao buscar CEP";
        status.style.color = "#e63946";
    }
}

function mostrarResumoCompleto() {
    // Resumo dos itens
    const resumoItensDiv = document.getElementById("resumo-itens");
    if (resumoItensDiv && checkoutData.items) {
        resumoItensDiv.innerHTML = checkoutData.items.map(item => `
            <div class="resumo-item">
                <strong>${item.pizza.name} (x${item.quantity})</strong>
                <span>R$ ${(item.pizza.price * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
        `).join('');
    }
    
    const resumoValorSpan = document.getElementById("resumo-valor");
    if (resumoValorSpan && checkoutData.total) {
        resumoValorSpan.textContent = `R$ ${checkoutData.total.toFixed(2).replace('.', ',')}`;
    }
    
    // Resumo dados pessoais
    const resumoDados = document.getElementById("resumo-dados");
    if (resumoDados) {
        resumoDados.innerHTML = `
            <strong>Nome:</strong> ${checkoutData.nome}<br>
            <strong>CPF:</strong> ${checkoutData.cpf}<br>
            <strong>Telefone:</strong> ${checkoutData.telefone}<br>
            <strong>E-mail:</strong> ${checkoutData.email}
        `;
    }
    
    // Resumo endereço
    const resumoEndereco = document.getElementById("resumo-endereco");
    if (resumoEndereco) {
        resumoEndereco.textContent = checkoutData.endereco;
    }
    
    // Resumo pagamento
    const resumoPagamento = document.getElementById("resumo-pagamento");
    if (resumoPagamento) {
        let pagamentoTexto = '';
        
        if (checkoutData.pagamento === 'dinheiro') {
            pagamentoTexto = `💵 Dinheiro (Troco: ${checkoutData.troco})`;
        } else if (checkoutData.pagamento === 'cartao') {
            pagamentoTexto = '💳 Cartão na Entrega';
        } else if (checkoutData.pagamento === 'pix') {
            pagamentoTexto = '📱 PIX';
        }
        
        if (checkoutData.observacoes && checkoutData.observacoes !== 'Sem observações') {
            pagamentoTexto += `<br><strong>Observações:</strong> ${checkoutData.observacoes}`;
        }
        
        resumoPagamento.innerHTML = pagamentoTexto;
    }
}

async function finalizarPedido() {
    const btn = document.getElementById("btn-confirmar");
    if (!btn) return;
    
    btn.disabled = true;
    btn.textContent = "⏳ Processando...";
    
    try {
        const res = await fetch(`${API_URL}/checkout`, {
            method: "POST",
            headers: {
                ...authHeaders(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                endereco: checkoutData.endereco,
                pagamento: checkoutData.pagamento,
                cpf: checkoutData.cpf,
                telefone: checkoutData.telefone,
                nome: checkoutData.nome,
                troco: checkoutData.troco,
                observacoes: checkoutData.observacoes
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Erro ao finalizar pedido");
        }
        
        const data = await res.json();
        
        fecharModalCheckout();
        showToast("🎉 Pedido realizado com sucesso! Em breve sua pizza chegará.");
        
        // Redirecionar para home após 2 segundos
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
        
    } catch (err) {
        console.error(err);
        showToast(`❌ ${err.message}`);
        btn.disabled = false;
        btn.textContent = "🍕 Finalizar Pedido";
    }
}

// FUNÇÃO DE NOTIFICAÇÃO TOAST
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

async function removerDoCarrinho(pizzaId) {
    if (!isLogged()) return;
    
    try {
        const res = await fetch(`${API_URL}/cart/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ pizza_id: pizzaId })
        });
        
        if (res.ok) {
            showToast("🗑️ Item removido do carrinho!");
            setTimeout(() => location.reload(), 800);
        } else {
            showToast("❌ Erro ao remover item.");
        }
    } catch (err) {
        showToast("❌ Erro ao remover item.");
    }
}

function initHeaderActions() {
  const btn = document.getElementById("btn-fazer-pedido");
  if (btn) {
    btn.onclick = () => {
      const token = localStorage.getItem("token");
      if (token) {
        window.location.href = "cardapio.html";
      } else {
        window.location.href = "login.html";
      }
    };
  }
  const accountLink = document.getElementById("nav-account");
  if (isLogged() && accountLink) {
      accountLink.innerText = "Sair";
      accountLink.href = "#";
      accountLink.onclick = (e) => {
          e.preventDefault();
          localStorage.removeItem("token");
          showToast("Você saiu da sua conta.");
          setTimeout(() => {
              window.location.href = '/';
          }, 1000);
      };
  }
}

function showInline(msgElement, text) {
  if (msgElement) {
    msgElement.innerText = text;
    msgElement.style.color = '#e63946'; 
  } else {
    alert(text);
  }
}

function initFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const cat = btn.dataset.cat;
      const cards = document.querySelectorAll(".pizza-card");

      cards.forEach(card => {
        if (cat === "todas" || card.dataset.cat === cat)
          card.style.display = "";
        else card.style.display = "none";
      });
    };
  });
}