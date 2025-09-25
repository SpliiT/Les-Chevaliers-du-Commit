/**
 * Premium Animations & Micro-interactions
 * Modern, smooth, performant animations for premium UX
 */

class AnimationEngine {
  constructor() {
    this.init();
    this.setupIntersectionObserver();
    this.setupMouseFollower();
    this.setupPageTransitions();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.setupAnimations()
      );
    } else {
      this.setupAnimations();
    }
  }

  setupAnimations() {
    this.animateOnScroll();
    this.setupHoverEffects();
    this.setupButtonAnimations();
    this.setupLoadingAnimations();
    this.setupParallaxEffects();
    this.setupMapAnimations();
    this.setupMazeAnimations();
  }

  // Intersection Observer for scroll animations
  setupIntersectionObserver() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          this.observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
  }

  // Animate elements on scroll
  animateOnScroll() {
    const elements = document.querySelectorAll(
      ".floating-menu, .info-overlay, .maze-cell"
    );

    elements.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";

      this.observer?.observe(el);
    });

    // Add animate-in styles
    const style = document.createElement("style");
    style.textContent = `
      .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Mouse follower effect
  setupMouseFollower() {
    const cursor = document.createElement("div");
    cursor.className = "cursor-follower";
    cursor.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.6) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      mix-blend-mode: difference;
      transition: all 0.1s ease;
      opacity: 0;
    `;
    document.body.appendChild(cursor);

    let mouseX = 0,
      mouseY = 0;
    let cursorX = 0,
      cursorY = 0;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.opacity = "1";
    });

    document.addEventListener("mouseleave", () => {
      cursor.style.opacity = "0";
    });

    // Smooth cursor following
    const animateCursor = () => {
      cursorX += (mouseX - cursorX) * 0.1;
      cursorY += (mouseY - cursorY) * 0.1;

      cursor.style.left = cursorX + "px";
      cursor.style.top = cursorY + "px";

      requestAnimationFrame(animateCursor);
    };
    animateCursor();

    // Cursor interactions
    const interactiveElements = document.querySelectorAll(
      "button, .legend-item, .sidebar-btn"
    );
    interactiveElements.forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.style.transform = "scale(1.5)";
        cursor.style.background =
          "radial-gradient(circle, rgba(212, 175, 55, 0.8) 0%, transparent 70%)";
      });

      el.addEventListener("mouseleave", () => {
        cursor.style.transform = "scale(1)";
        cursor.style.background =
          "radial-gradient(circle, rgba(212, 175, 55, 0.6) 0%, transparent 70%)";
      });
    });
  }

  // Enhanced hover effects
  setupHoverEffects() {
    const hoverElements = document.querySelectorAll(
      ".menu-btn, .sidebar-btn, .legend-item"
    );

    hoverElements.forEach((el) => {
      el.addEventListener("mouseenter", (e) => {
        this.createRippleEffect(e.target, e.clientX, e.clientY);
        this.animateHoverIn(e.target);
      });

      el.addEventListener("mouseleave", (e) => {
        this.animateHoverOut(e.target);
      });
    });
  }

  // Ripple effect on click
  createRippleEffect(element, x, y) {
    const ripple = document.createElement("div");
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(212, 175, 55, 0.3);
      width: ${size}px;
      height: ${size}px;
      left: ${x - rect.left - size / 2}px;
      top: ${y - rect.top - size / 2}px;
      pointer-events: none;
      transform: scale(0);
      animation: ripple 0.6s ease-out forwards;
      z-index: 1;
    `;

    if (!document.querySelector("style[data-ripple]")) {
      const style = document.createElement("style");
      style.setAttribute("data-ripple", "true");
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    element.style.position = "relative";
    element.appendChild(ripple);

    ripple.addEventListener("animationend", () => {
      ripple.remove();
    });
  }

  animateHoverIn(element) {
    gsap?.to?.(element, {
      scale: 1.05,
      duration: 0.3,
      ease: "power2.out",
    }) || (element.style.transform = "scale(1.05)");
  }

  animateHoverOut(element) {
    gsap?.to?.(element, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
    }) || (element.style.transform = "scale(1)");
  }

  // Button click animations
  setupButtonAnimations() {
    const buttons = document.querySelectorAll("button, .clickable");

    buttons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();

        // Click animation
        button.style.transform = "scale(0.95)";
        button.style.transition = "transform 0.1s ease";

        setTimeout(() => {
          button.style.transform = "";
          setTimeout(() => {
            button.style.transition = "";
            // Execute original click handler
            if (button.onclick && typeof button.onclick === "function") {
              button.onclick.call(button, e);
            }
          }, 100);
        }, 100);

        this.createRippleEffect(button, e.clientX, e.clientY);
      });
    });
  }

  // Loading animations
  setupLoadingAnimations() {
    this.showPageLoader();

    window.addEventListener("load", () => {
      this.hidePageLoader();
    });
  }

  showPageLoader() {
    const loader = document.createElement("div");
    loader.id = "page-loader";
    loader.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #0a0a0a 0%, #000000 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      transition: opacity 0.5s ease, transform 0.5s ease;
    `;

    const spinner = document.createElement("div");
    spinner.style.cssText = `
      width: 60px;
      height: 60px;
      border: 2px solid rgba(212, 175, 55, 0.2);
      border-top: 2px solid #d4af37;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    loader.appendChild(spinner);
    document.body.appendChild(loader);
  }

  hidePageLoader() {
    const loader = document.getElementById("page-loader");
    if (loader) {
      loader.style.opacity = "0";
      loader.style.transform = "scale(1.1)";
      setTimeout(() => loader.remove(), 500);
    }

    // Trigger enter animations
    this.triggerEnterAnimations();
  }

  triggerEnterAnimations() {
    const elements = document.querySelectorAll(".sidebar, .main-content");
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, index * 100);
    });
  }

  // Parallax effects
  setupParallaxEffects() {
    let ticking = false;

    const updateParallax = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.5;

      document.body.style.backgroundPosition = `center ${rate}px`;
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateParallax);
      }
    };

    window.addEventListener("scroll", requestTick, { passive: true });
  }

  // Map animations
  setupMapAnimations() {
    const mapContainer = document.getElementById("map-container");
    if (mapContainer) {
      mapContainer.addEventListener("transitionend", () => {
        if (mapContainer.classList.contains("active")) {
          this.animateMapMarkers();
        }
      });
    }
  }

  animateMapMarkers() {
    // Animate map markers when they appear
    setTimeout(() => {
      const markers = document.querySelectorAll(".leaflet-marker-icon");
      markers.forEach((marker, index) => {
        marker.style.opacity = "0";
        marker.style.transform = "scale(0) rotate(180deg)";
        marker.style.transition =
          "all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)";

        setTimeout(() => {
          marker.style.opacity = "1";
          marker.style.transform = "scale(1) rotate(0deg)";
        }, index * 100);
      });
    }, 300);
  }

  // Maze animations
  setupMazeAnimations() {
    const mazeContainer = document.getElementById("maze-container");
    if (mazeContainer) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.classList?.contains("maze-cell")) {
                this.animateMazeCell(node);
              }
            });
          }
        });
      });

      observer.observe(document.getElementById("maze"), {
        childList: true,
        subtree: true,
      });
    }
  }

  animateMazeCell(cell) {
    cell.style.opacity = "0";
    cell.style.transform = "scale(0)";
    cell.style.transition = "all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)";

    setTimeout(() => {
      cell.style.opacity = "1";
      cell.style.transform = "scale(1)";
    }, Math.random() * 100);
  }

  // Page transitions
  setupPageTransitions() {
    const sidebar = document.querySelector(".sidebar");
    const buttons = sidebar?.querySelectorAll(".sidebar-btn");

    buttons?.forEach((button) => {
      button.addEventListener("click", (e) => {
        if (!button.classList.contains("active")) {
          this.transitionToPhase(button);
        }
      });
    });
  }

  transitionToPhase(activeButton) {
    const currentPhase = document.querySelector(".phase-content.active");

    if (currentPhase) {
      // Fade out current phase
      currentPhase.style.transform = "translateX(-20px)";
      currentPhase.style.opacity = "0";

      setTimeout(() => {
        currentPhase.classList.remove("active");

        // Determine next phase
        const isMapButton = activeButton.querySelector(".fa-map");
        const nextPhase = document.getElementById(
          isMapButton ? "map-container" : "maze-container"
        );

        if (nextPhase) {
          nextPhase.style.transform = "translateX(20px)";
          nextPhase.style.opacity = "0";
          nextPhase.classList.add("active");

          // Fade in next phase
          setTimeout(() => {
            nextPhase.style.transform = "translateX(0)";
            nextPhase.style.opacity = "1";
          }, 50);
        }

        // Update active button
        document
          .querySelectorAll(".sidebar-btn")
          .forEach((btn) => btn.classList.remove("active"));
        activeButton.classList.add("active");
      }, 200);
    }
  }

  // Utility: Create floating particles
  createFloatingParticles() {
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.style.cssText = `
        position: fixed;
        width: 2px;
        height: 2px;
        background: rgba(212, 175, 55, 0.3);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        animation: float ${5 + Math.random() * 10}s linear infinite;
      `;

      particle.style.left = Math.random() * 100 + "vw";
      particle.style.animationDelay = Math.random() * 5 + "s";

      document.body.appendChild(particle);
    }

    const style = document.createElement("style");
    style.textContent = `
      @keyframes float {
        0% {
          transform: translateY(100vh) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          transform: translateY(-100px) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Performance optimization: Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize animation engine
const animationEngine = new AnimationEngine();

// Export for external use
window.AnimationEngine = AnimationEngine;

// Add some extra micro-interactions
document.addEventListener("DOMContentLoaded", () => {
  // Smooth scrolling for all internal links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Add focus indicators for keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      document.body.classList.add("keyboard-nav");
    }
  });

  document.addEventListener("mousedown", () => {
    document.body.classList.remove("keyboard-nav");
  });
});

// Performance monitoring
if (window.performance && window.performance.measure) {
  window.addEventListener("load", () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType("navigation")[0];
      console.log(
        `🚀 Page loaded in ${perfData.loadEventEnd - perfData.loadEventStart}ms`
      );
    }, 0);
  });
}
