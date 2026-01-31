// Menu responsivo
document.addEventListener('DOMContentLoaded', function () {
  // Toggle do menu mobile
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function () {
      const isOpen = navMenu.style.display === 'flex';

      navMenu.style.display = isOpen ? 'none' : 'flex';

      // Ajustes para mobile
      if (window.innerWidth <= 768 && !isOpen) {
        navMenu.style.flexDirection = 'column';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '100%';
        navMenu.style.left = '0';
        navMenu.style.width = '100%';
        navMenu.style.backgroundColor = '#fff';
        navMenu.style.padding = '20px';
        navMenu.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
        navMenu.style.gap = '15px';
        navMenu.style.zIndex = '1000';
      }
    });

    // Ajusta o menu ao redimensionar a tela
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        navMenu.style.display = 'flex';
        navMenu.style.flexDirection = 'row';
        navMenu.style.position = 'static';
        navMenu.style.backgroundColor = 'transparent';
        navMenu.style.padding = '0';
        navMenu.style.boxShadow = 'none';
        navMenu.style.gap = '0';
      } else {
        navMenu.style.display = 'none';
      }
    });
  }

  // Formulário de contato
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const message = document.getElementById('message').value.trim();

      if (!name || !phone) {
        alert('Por favor, preencha nome e telefone.');
        return;
      }

      alert(`Obrigado, ${name}! Sua mensagem foi recebida. Em breve entraremos em contato.`);

      contactForm.reset();

      // 👉 Se quiser redirecionar para o WhatsApp automaticamente:
      /*
      const whatsappMessage = `Olá, meu nome é ${name}. ${message}`;
      const encodedMessage = encodeURIComponent(whatsappMessage);
      window.open(`https://wa.me/558894407267?text=${encodedMessage}`, '_blank');
      */
    });
  }
});
