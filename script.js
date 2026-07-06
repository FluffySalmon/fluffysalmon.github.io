
const menu=document.getElementById('menuToggle');
const links=document.getElementById('navLinks');
menu.onclick=()=>links.classList.toggle('active');
document.querySelectorAll('.nav-links a').forEach(a=>a.onclick=()=>links.classList.remove('active'));
const reveal=()=>document.querySelectorAll('.reveal').forEach(e=>{if(e.getBoundingClientRect().top<window.innerHeight-100)e.classList.add('active')});
addEventListener('scroll',reveal);addEventListener('load',reveal);
document.querySelector('.contact-form').onsubmit=e=>{e.preventDefault();alert('Placeholder form.');};
