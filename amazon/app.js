// ===== DADOS CARREGADOS EXTERNAMENTE =====
let CONFIG = {};
let products = [];

// ===== ESTADO DA APLICAÇÃO =====
let state = {
  currentCategory: 'all',
  currentFilter: 'all',
  currentSort: 'relevancia',
  currentSearch: '',
  currentPage: 1,
  wishlist: JSON.parse(localStorage.getItem('wishlist')) || [],
  viewedProducts: JSON.parse(localStorage.getItem('viewedProducts')) || []
};

// ===== ELEMENTOS DOM =====
const elements = {
  productsContainer: document.getElementById('products-container'),
  productsCount: document.getElementById('products-count'),
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  sortBtn: document.getElementById('sort-btn'),
  sortDropdown: document.getElementById('sort-dropdown'),
  backToTop: document.getElementById('back-to-top'),
  couponModal: document.getElementById('coupon-modal'),
  closeCoupon: document.getElementById('close-coupon'),
  copyCoupon: document.getElementById('copy-coupon'),
  couponText: document.getElementById('coupon-text'),
  newsletterForm: document.getElementById('newsletter-form')
};

// ===== FUNÇÕES UTILITÁRIAS =====
function formatPrice(price) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

function getCategoryColor(category) {
  const colors = {
    eletronicos: 'var(--cat-eletronicos)',
    beleza: 'var(--cat-beleza)',
    casa: 'var(--cat-casa)',
    cozinha: 'var(--cat-cozinha)',
    fitness: 'var(--cat-fitness)',
    gamer: 'var(--cat-gamer)',
    pet: 'var(--cat-pet)',
    outros: 'var(--cat-outros)'
  };
  return colors[category] || 'var(--primary)';
}

function getCategoryIcon(category) {
  const icons = {
    eletronicos: 'fas fa-laptop',
    beleza: 'fas fa-spa',
    casa: 'fas fa-home',
    cozinha: 'fas fa-utensils',
    fitness: 'fas fa-dumbbell',
    gamer: 'fas fa-gamepad',
    pet: 'fas fa-paw',
    outros: 'fas fa-ellipsis-h'
  };
  return icons[category] || 'fas fa-shopping-bag';
}

function generateStars(rating) {
  let stars = '';
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars += '<i class="fas fa-star"></i>';
    } else if (i === fullStars && hasHalfStar) {
      stars += '<i class="fas fa-star-half-alt"></i>';
    } else {
      stars += '<i class="far fa-star"></i>';
    }
  }
  
  return stars;
}

// ===== FUNÇÕES DE RENDERIZAÇÃO =====
function renderProductCard(product) {
  const isInWishlist = state.wishlist.includes(product.id);
  const affiliateLink = `${product.link}?tag=${CONFIG.amazonTag}`;
  const categoryColor = getCategoryColor(product.category);
  
  return `
    <article class="product-card fade-in" data-id="${product.id}" data-category="${product.category}">
      <div class="product-badges">
        ${product.badges.includes('discount') ? 
          `<span class="badge discount">-${product.discount}%</span>` : ''}
        ${product.badges.includes('frete_gratis') ? 
          `<span class="badge frete">FRETE GRÁTIS</span>` : ''}
        ${product.badges.includes('novidade') ? 
          `<span class="badge new">NOVO</span>` : ''}
      </div>
      
      <img src="${product.image}" 
           alt="${product.name}" 
           class="product-image"
           loading="lazy"
           onerror="this.src='${CONFIG.defaultImage}'">
      
      <div class="product-info">
        <span class="product-category" style="color: ${categoryColor}">
          <i class="${getCategoryIcon(product.category)}"></i>
          ${product.category.charAt(0).toUpperCase() + product.category.slice(1)}
        </span>
        
        <h3 class="product-title">${product.name}</h3>
        
        <div class="product-rating">
          <div class="stars">
            ${generateStars(product.rating)}
          </div>
          <span class="rating-count">(${product.ratingCount})</span>
        </div>
        
        <div class="price">
          ${product.oldPrice ? 
            `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ''}
          <span class="current-price">${formatPrice(product.price)}</span>
          
        </div>
        
        ${product.tiktokerVerdict ? 
          `<div class="tiktoker-verdict">
            <i class="fas fa-quote-left"></i>
            ${product.tiktokerVerdict}
          </div>` : ''}
        
        <div class="product-actions">
          <a href="${affiliateLink}" 
             class="buy-btn" 
             target="_blank"
             rel="noopener noreferrer nofollow"
             onclick="trackProductClick(${product.id})">
            <i class="fas fa-bolt"></i>
            COMPRAR AGORA
          </a>
          
          <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                  onclick="toggleWishlist(${product.id})"
                  aria-label="${isInWishlist ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderProducts() {
  let filteredProducts = [...products];
  
  // Aplicar filtro de categoria
  if (state.currentCategory !== 'all') {
    filteredProducts = filteredProducts.filter(
      product => product.category === state.currentCategory
    );
  }
  
  // Aplicar filtro de tags
  if (state.currentFilter !== 'all') {
    filteredProducts = filteredProducts.filter(
      product => product.tags.includes(state.currentFilter)
    );
  }
  
  // Aplicar busca
  if (state.currentSearch) {
    const searchTerm = state.currentSearch.toLowerCase();
    filteredProducts = filteredProducts.filter(
      product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
  }
  
  // Aplicar ordenação
  filteredProducts.sort((a, b) => {
    switch (state.currentSort) {
      case 'preco_menor':
        return a.price - b.price;
      case 'preco_maior':
        return b.price - a.price;
      case 'avaliacao':
        return b.rating - a.rating;
      case 'novidade':
        return b.id - a.id;
      default:
        return 0;
    }
  });
  
  // Atualizar contador
  elements.productsCount.textContent = filteredProducts.length;
  
  // Renderizar produtos
  elements.productsContainer.innerHTML = filteredProducts.length > 0 
    ? filteredProducts.map(renderProductCard).join('')
    : `
      <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 4rem;">
        <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-dark); margin-bottom: 1rem;"></i>
        <h3 style="margin-bottom: 1rem;">Nenhum produto encontrado</h3>
        <p>Tente outros termos de busca ou filtros diferentes</p>
        <button onclick="clearFilters()" style="margin-top: 1rem; padding: 0.8rem 1.5rem; background: var(--primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer;">
          Limpar Filtros
        </button>
      </div>
    `;
}

// ===== FUNÇÕES DE ESTADO =====
function updateCategory(category) {
  state.currentCategory = category;
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  renderProducts();
  saveState();
}

function updateFilter(filter) {
  state.currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderProducts();
  saveState();
}

function updateSort(sort) {
  state.currentSort = sort;
  renderProducts();
  saveState();
}

function updateSearch(term) {
  state.currentSearch = term.trim();
  renderProducts();
  saveState();
}

function toggleWishlist(productId) {
  const index = state.wishlist.indexOf(productId);
  if (index === -1) {
    state.wishlist.push(productId);
    showNotification('Produto adicionado aos favoritos! 💖');
  } else {
    state.wishlist.splice(index, 1);
    showNotification('Produto removido dos favoritos');
  }
  
  localStorage.setItem('wishlist', JSON.stringify(state.wishlist));
  renderProducts();
}

function trackProductClick(productId) {
  if (!state.viewedProducts.includes(productId)) {
    state.viewedProducts.push(productId);
    localStorage.setItem('viewedProducts', JSON.stringify(state.viewedProducts));
  }
  
  // Aqui você pode adicionar Google Analytics ou outro tracking
  console.log(`Produto clicado: ${productId}`);
}

// ===== FUNÇÕES DE UI =====
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--primary);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: var(--radius);
      z-index: 1000;
      animation: slideInRight 0.3s ease;
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    ">
      <i class="fas fa-check-circle"></i>
      ${message}
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showCouponModal() {
  if (!localStorage.getItem('couponShown')) {
    setTimeout(() => {
      elements.couponModal.style.display = 'block';
      localStorage.setItem('couponShown', 'true');
    }, CONFIG.showCouponDelay);
  }
}

function copyCouponToClipboard() {
  navigator.clipboard.writeText(elements.couponText.textContent)
    .then(() => {
      showNotification('Cupom copiado! 🎉');
      elements.copyCoupon.innerHTML = '<i class="fas fa-check"></i> Copiado!';
      setTimeout(() => {
        elements.copyCoupon.innerHTML = '<i class="far fa-copy"></i> Copiar';
      }, 2000);
    })
    .catch(err => {
      console.error('Erro ao copiar:', err);
      showNotification('Erro ao copiar cupom');
    });
}

function handleNewsletterSubmit(e) {
  e.preventDefault();
  const email = e.target.querySelector('input[type="email"]').value;
  
  // Aqui você integraria com seu serviço de newsletter
  console.log('Email cadastrado:', email);
  
  showNotification('Cadastrado com sucesso! 🎁 Verifique seu email.');
  e.target.reset();
  
  // Exemplo de integração com EmailJS ou similar
  // emailjs.send('service_id', 'template_id', { email: email });
}

function clearFilters() {
  state.currentCategory = 'all';
  state.currentFilter = 'all';
  state.currentSearch = '';
  state.currentSort = 'relevancia';
  
  elements.searchInput.value = '';
  
  document.querySelectorAll('.category-btn, .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === 'all' || btn.dataset.filter === 'all');
  });
  
  renderProducts();
  saveState();
}

function saveState() {
  localStorage.setItem('appState', JSON.stringify({
    category: state.currentCategory,
    filter: state.currentFilter,
    sort: state.currentSort,
    search: state.currentSearch
  }));
}

function loadState() {
  const saved = JSON.parse(localStorage.getItem('appState'));
  if (saved) {
    state.currentCategory = saved.category || 'all';
    state.currentFilter = saved.filter || 'all';
    state.currentSort = saved.sort || 'relevancia';
    state.currentSearch = saved.search || '';
  }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Categorias
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateCategory(btn.dataset.category);
    });
  });
  
  // Filtros rápidos
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateFilter(btn.dataset.filter);
    });
  });
  
  // Busca
  elements.searchBtn.addEventListener('click', () => {
    updateSearch(elements.searchInput.value);
  });
  
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      updateSearch(elements.searchInput.value);
    }
  });
  
  // Ordenação
  elements.sortBtn.addEventListener('click', () => {
    elements.sortDropdown.classList.toggle('show');
  });
  
  document.querySelectorAll('.sort-option').forEach(option => {
    option.addEventListener('click', () => {
      updateSort(option.dataset.sort);
      elements.sortDropdown.classList.remove('show');
      elements.sortBtn.innerHTML = `<i class="fas fa-sort-amount-down"></i> ${option.textContent}`;
    });
  });
  
  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-toggle') && !e.target.closest('.sort-dropdown')) {
      elements.sortDropdown.classList.remove('show');
    }
  });
  
  // Botão voltar ao topo
  elements.backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  window.addEventListener('scroll', () => {
    elements.backToTop.style.display = window.scrollY > 500 ? 'flex' : 'none';
  });
  
  // Cupom
  elements.closeCoupon.addEventListener('click', () => {
    elements.couponModal.style.display = 'none';
  });
  
  elements.copyCoupon.addEventListener('click', copyCouponToClipboard);
  
  // Newsletter
  if (elements.newsletterForm) {
    elements.newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }
  
  // Links do footer
  document.querySelectorAll('.footer-links .filter-btn').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      updateFilter(link.dataset.filter);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ===== CARREGAR DADOS EXTERNOS =====
async function loadData() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    
    CONFIG = data.CONFIG;
    products = data.products;
    
    // Atualizar informações dinâmicas no DOM
    document.querySelectorAll('.tiktoker-name').forEach(el => {
      el.textContent = CONFIG.tiktokerName;
    });
    

    
    // Inicializar aplicação após carregar dados
    init();
    
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    
    // Fallback: usar dados padrão em caso de erro
    CONFIG = {
      amazonTag: 'TIKTOKER20',
      defaultImage: 'https://via.placeholder.com/400x300/1a1a2e/ffffff?text=Produto+Indicado',
      itemsPerPage: 12,
      showCouponDelay: 30000,
      tiktokerName: 'Nagila lima',
      tiktokUsername: '@nagilalima22'
    };
    
    products = [];
    
    showNotification('Erro ao carregar produtos. Tente novamente mais tarde.');
  }
}

// ===== INICIALIZAÇÃO =====
function init() {
  // Carregar estado salvo
  loadState();
  
  // Atualizar UI com estado
  elements.searchInput.value = state.currentSearch;
  document.querySelector(`.category-btn[data-category="${state.currentCategory}"]`)?.classList.add('active');
  document.querySelector(`.filter-btn[data-filter="${state.currentFilter}"]`)?.classList.add('active');
  
  // Renderizar produtos
  renderProducts();
  
  // Configurar event listeners
  setupEventListeners();
  
  // Mostrar cupom após delay
  showCouponModal();
  
  // Log para debug
  console.log(`💎 Site das Indicações da ${CONFIG.tiktokerName}`);
  console.log(`📱 TikTok: ${CONFIG.tiktokUsername}`);
  console.log(`🛍️ ${products.length} produtos carregados`);
}

// ===== INICIALIZAR QUANDO O DOM ESTIVER PRONTO =====
document.addEventListener('DOMContentLoaded', loadData);

// ===== FUNÇÕES GLOBAIS (para onclick no HTML) =====
window.toggleWishlist = toggleWishlist;
window.trackProductClick = trackProductClick;
window.clearFilters = clearFilters;

// ===== SERVICE WORKER PARA OFFLINE (OPCIONAL) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('Service Worker registration failed:', error);
    });
  });
}