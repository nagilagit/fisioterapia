document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const contactForm = document.getElementById('contactForm');

  // =========================
  // MENU MOBILE
  // =========================
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Fecha o menu ao clicar em um link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // =========================
  // FORMULÁRIO DE CONTATO
  // (ENVIA PARA WHATSAPP)
  // =========================
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name')?.value.trim();
      const phone = document.getElementById('phone')?.value.trim();
      const message = document.getElementById('message')?.value.trim();

      if (!name || !phone) {
        alert('Preencha nome e telefone.');
        return;
      }

      const text = `
Olá, Dr. Nágila
Meu nome é ${name}
Telefone: ${phone}

Mensagem:
${message || 'Gostaria de mais informações.'}
      `;

      const encodedText = encodeURIComponent(text);
      const whatsappNumber = '558894407267';

      window.open(
        `https://wa.me/${whatsappNumber}?text=${encodedText}`,
        '_blank'
      );

      contactForm.reset();
    });
  }
});
