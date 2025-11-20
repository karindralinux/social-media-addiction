const hamburger = document.querySelector(".hamburger-menu");
const mobileMenu = document.getElementById("mobileMenu");

hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("active");
    hamburger.classList.toggle("active");
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
        mobileMenu.classList.remove("active");
        hamburger.classList.remove("active"); 
    }
});

// hamburgerMenu.addEventListener('click', function () {
//     this.classList.toggle('active');

//     menuMobile.classList.toggle('active');
// });