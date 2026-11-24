/* Настройка Typed.js */
var typed = new Typed('#typing-text', {
    strings: ['Привет','Я Веб-разработчик'], // Фразы, которые будут меняться
    typeSpeed: 50,    // Скорость печати (мс на букву)
    backSpeed: 30,    // Скорость стирания
    backDelay: 1000,  // Пауза перед стиранием (2 секунды)
    loop: false        // Зациклить анимацию (true) или остановить после одного раза (false)
});

/* Настройка Vanilla-Tilt */
VanillaTilt.init(document.querySelector(".tilt-card"), {
    max: 25,            // Максимальный угол наклона (градусы)
    speed: 400,         // Скорость возврата в исходное положение
    glare: true,        // Включить эффект "блика" (света)
    "max-glare": 0.5    // Прозрачность блика (от 0 до 1)
});
/* Инициализация AOS */
AOS.init({
    duration: 1000, /* Длительность анимации в миллисекундах (1 секунда) */
    once: true,     /* Анимация проигрывается только один раз */
});

// Запуск фоновой анимации частиц
if (window.initParticlesBackground) {
    window.initParticlesBackground({
        particleCount: 200,
        particleColors: ['#ffffff'],
        alphaParticles: false,
        particleBaseSize: 80,
        sizeRandomness: 1,
        cameraDistance: 20,
        pixelRatio: window.devicePixelRatio || 1
    });
}