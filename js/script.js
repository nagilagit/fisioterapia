// Menu responsivo
document.addEventListener('DOMContentLoaded', function() {
  // Toggle do menu mobile
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
      
      // Ajusta para layout responsivo
      if (window.innerWidth <= 768) {
        if (navMenu.style.display === 'flex') {
          navMenu.style.flexDirection = 'column';
          navMenu.style.position = 'absolute';
          navMenu.style.top = '100%';
          navMenu.style.left = '0';
          navMenu.style.width = '100%';
          navMenu.style.backgroundColor = 'white';
          navMenu.style.padding = '20px';
          navMenu.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
          navMenu.style.gap = '15px';
        }
      }
    });
    
    // Ajusta o menu quando a janela é redimensionada
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
        navMenu.style.display = 'flex';
        navMenu.style.flexDirection = 'row';
        navMenu.style.position = 'static';
        navMenu.style.backgroundColor = 'transparent';
        navMenu.style.padding = '0';
        navMenu.style.boxShadow = 'none';
      } else {
        navMenu.style.display = 'none';
      }
    });
  }
  
  // Formulário de contato
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Simulação de envio do formulário
      const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        message: document.getElementById('message').value
      };
      
      // Aqui normalmente enviaria os dados para um servidor
      // Por enquanto, vamos apenas mostrar um alerta e redirecionar para o WhatsApp
      alert(`Obrigado, ${formData.name}! Sua mensagem foi recebida. Em breve entraremos em contato.`);
      
      // Limpa o formulário
      contactForm.reset();
      
      // Opcional: Redireciona para o WhatsApp com a mensagem pré-preenchida
      // const whatsappMessage = `Olá, sou ${formData.name}. ${formData.message}`;
      // const encodedMessage = encodeURIComponent(whatsappMessage);
      // window.open(`https://wa.me/5599999999999?text=${encodedMessage}`, '_blank');