$(document).ready(function () {
  function getRealSlidesCount(swiper) {
    return swiper.el.querySelectorAll(
      ".swiper-wrapper .swiper-slide:not(.swiper-slide-duplicate)"
    ).length;
  }

  function setupPagination(swiper) {
    const total = getRealSlidesCount(swiper);
    const pagination = document.querySelector(".statistical-pagination");
    if (!pagination) return;

    if (!pagination.dataset.ready) {
      pagination.innerHTML = `
        <span class="current">01</span>
        <span class="progress-line"></span>
        <span class="total">${String(total).padStart(2, "0")}</span>
      `;
      pagination.dataset.ready = "1";
    } else {
      pagination.querySelector(".total").textContent = String(total).padStart(
        2,
        "0"
      );
    }
  }

  function updatePagination(swiper) {
    const total = getRealSlidesCount(swiper);
    const current = (swiper.realIndex % total) + 1;
    const progress = (current / total) * 100;

    const pagination = document.querySelector(".statistical-pagination");
    if (!pagination) return;

    pagination.querySelector(".current").textContent = String(current).padStart(
      2,
      "0"
    );
    pagination
      .querySelector(".progress-line")
      .style.setProperty("--progress", `${progress}%`);
  }

  // CREATE SWIPER
  const heroSwiper = new Swiper(".heroSwiper", {
    loop: true,
    speed: 1500,
    allowTouchMove: true,
    effect: "fade",
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: false,
    },

    on: {
      init(swiper) {
        setupPagination(swiper);
        updatePagination(swiper);
      },
      slideChange(swiper) {
        updatePagination(swiper);
      },
      slidesLengthChange(swiper) {
        setupPagination(swiper);
        updatePagination(swiper);
      },
    },
  });
});
$(document).ready(function () {
  const keyIndicators = new Swiper(".key-indicators-swiper", {
    spaceBetween: 20,
    centeredSlides: false,
    loop: true,
    speed: 1500,
    allowTouchMove: true,
    spaceBetween: 20,
    // autoplay: {
    //   delay: 1,
    //   disableOnInteraction: false,
    //   pauseOnMouseEnter: false,
    // },
    navigation: {
      nextEl: ".swipe-next",
      prevEl: ".swipe-prev",
    },
    breakpoints: {
      640: {
        slidesPerView: 1,
      },
      768: {
        slidesPerView: 2,
      },
      1024: {
        slidesPerView: 2.5,
      },
    },
  });
});

$(document).ready(function () {
  const aboutTeam = new Swiper(".team-swiper", {
    spaceBetween: 0,
    centeredSlides: false,
    loop: true,
    speed: 1500,
    allowTouchMove: true,
    spaceBetween: 10,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: false,
    },
    navigation: {
      nextEl: ".swipe-t-next",
      prevEl: ".swipe-t-prev",
    },
    breakpoints: {
      640: {
        slidesPerView: 1,
      },
      768: {
        slidesPerView: 2,
      },
      1024: {
        slidesPerView: 4,
      },
    },
  });
});
$(document).ready(function () {
  const yearSwiper = new Swiper(".year-swiper", {
    slidesPerView: 5,
    spaceBetween: 0,
    centeredSlides: false,
    speed: 500,
    loop: true,
    allowTouchMove: false,

    navigation: {
      nextEl: ".year-next",
      prevEl: ".year-prev",
    },
  });
});
$(document).ready(function () {
  $(".search").on("click", function () {
    $(".search-modal").fadeIn().css("display", "flex");
  });
  $(".search-close").on("click", function () {
    $(".search-modal").fadeOut();
  });
});
$(document).ready(function () {
  
});
function createPillarChart(container) {
    //   Prevent double render
    if (container.dataset.rendered) return;
    container.dataset.rendered = "true";
    console.log(container);
    

    const percent = Number(container.dataset.percent) || 0;
    const maxHeight = Number(container.dataset.maxHeight) || 100;
    const value = Number(container.dataset.value) || 0;
    const label = container.dataset.label || "";
    const description = container.dataset.description || "";

    // Create card
    const card = document.createElement("div");
    card.className = "pillar-card-custome";

    // Create pillar container
    const pillarContainer = document.createElement("div");
    pillarContainer.className = "pillar-container";

    const svgNS = "http://www.w3.org/2000/svg";

    // Constants
    const MAX_PILLAR_HEIGHT = container.classList.contains('chart-container-cente-val')?260 :360;
    const BASE_Y =container.classList.contains('chart-container-cente-val')?260 :360;
    const DEPTH = 8;
    const PILLAR_WIDTH = 18;
    const PILLAR_X = 18;

    // Height calculation (0–100 logic ✔)
    const allowedHeight = (maxHeight / 100) * MAX_PILLAR_HEIGHT;
    const finalHeight = (percent / 100) * allowedHeight;

    const emptyTopY = BASE_Y - allowedHeight;
    const filledTopY = BASE_Y - finalHeight;

    /* ================= EMPTY PILLAR ================= */

    const emptySvg = document.createElementNS(svgNS, "svg");
    emptySvg.setAttribute("class", "pillar-svg empty-pillar");
    emptySvg.setAttribute("width", "60");
    emptySvg.setAttribute("height", BASE_Y);
    emptySvg.setAttribute("viewBox", `0 0 60 ${BASE_Y}`);

    const emptyFront = document.createElementNS(svgNS, "rect");
    emptyFront.setAttribute("class", "front");
    emptyFront.setAttribute("x", PILLAR_X);
    emptyFront.setAttribute("y", emptyTopY);
    emptyFront.setAttribute("width", PILLAR_WIDTH);
    emptyFront.setAttribute("height", allowedHeight);

    const emptySide = document.createElementNS(svgNS, "polygon");
    emptySide.setAttribute("class", "side");
    emptySide.setAttribute(
      "points",
      `
    ${PILLAR_X + PILLAR_WIDTH} ${emptyTopY}
    ${PILLAR_X + PILLAR_WIDTH + DEPTH} ${emptyTopY - DEPTH}
    ${PILLAR_X + PILLAR_WIDTH + DEPTH} ${BASE_Y - DEPTH}
    ${PILLAR_X + PILLAR_WIDTH} ${BASE_Y}
    `
    );

    const emptyTop = document.createElementNS(svgNS, "polygon");
    emptyTop.setAttribute("class", "top");
    emptyTop.setAttribute(
      "points",
      `
    ${PILLAR_X} ${emptyTopY}
    ${PILLAR_X + PILLAR_WIDTH} ${emptyTopY}
    ${PILLAR_X + PILLAR_WIDTH + DEPTH} ${emptyTopY - DEPTH}
    ${PILLAR_X + DEPTH} ${emptyTopY - DEPTH}
    `
    );

    emptySvg.append(emptyFront, emptySide, emptyTop);

    /* ================= FILLED PILLAR ================= */

    const filledSvg = document.createElementNS(svgNS, "svg");
    filledSvg.setAttribute("class", "pillar-svg filled-pillar");
    filledSvg.setAttribute("width", "60");
    filledSvg.setAttribute("height", BASE_Y);
    filledSvg.setAttribute("viewBox", `0 0 60 ${BASE_Y}`);

    const filledFront = document.createElementNS(svgNS, "rect");
    filledFront.setAttribute("class", "front");
    filledFront.setAttribute("x", PILLAR_X);
    filledFront.setAttribute("y", BASE_Y);
    filledFront.setAttribute("width", PILLAR_WIDTH);
    filledFront.setAttribute("height", 0);

    const filledSide = document.createElementNS(svgNS, "polygon");
    filledSide.setAttribute("class", "side");

    const filledTop = document.createElementNS(svgNS, "polygon");
    filledTop.setAttribute("class", "top");

    filledSvg.append(filledFront, filledSide, filledTop);

    pillarContainer.append(emptySvg, filledSvg);

    /* ================= INFO ================= */

    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = `
    <p class="label">${label}</p>
    <h2 class="value">0</h2>
    <span class="description">${description}</span>
  `;

    card.append(pillarContainer, info);
    container.appendChild(card);

    /* ================= FIXED HEIGHT ANIMATION ================= */

    const scale = percent / 100;

    requestAnimationFrame(() => {
      // draw at full allowed height
      filledFront.setAttribute("y", emptyTopY);
      filledFront.setAttribute("height", allowedHeight);

      filledSide.setAttribute(
        "points",
        `
    ${PILLAR_X + PILLAR_WIDTH} ${emptyTopY}
    ${PILLAR_X + PILLAR_WIDTH + DEPTH} ${emptyTopY - DEPTH}
    ${PILLAR_X + PILLAR_WIDTH + DEPTH} ${BASE_Y - DEPTH}
    ${PILLAR_X + PILLAR_WIDTH} ${BASE_Y}
    `
      );

      filledTop.setAttribute(
        "points",
        `
    ${PILLAR_X} ${emptyTopY}
    ${PILLAR_X + PILLAR_WIDTH} ${emptyTopY}
    ${PILLAR_X + PILLAR_WIDTH + DEPTH} ${emptyTopY - DEPTH}
    ${PILLAR_X + DEPTH} ${emptyTopY - DEPTH}
    `
      );

     
      filledFront.style.transform = `scaleY(${scale})`;
      filledSide.style.transform = `scaleY(${scale})`;
      filledTop.style.transform = `scaleY(${scale})`;
    });

    /* ================= COUNTER ================= */

    let current = 0;
    const step = value / 60;
    const valueEl = info.querySelector(".value");

    const timer = setInterval(() => {
      current += step;
      if (current >= value) {
        current = value;
        clearInterval(timer);
      }
      valueEl.textContent = Math.floor(current).toLocaleString();
    }, 16);
  }
if($('.buildings-insight-item').length){
  document.querySelectorAll(".chart-container").forEach(createPillarChart);
}

$(document).ready(function () {
  // make .header fixed on scroll
  var header = $(".header");
  $(window).scroll(function () {
    // console.log($(this).scrollTop());

    if ($(this).scrollTop() > 50) {
      header.addClass("fixed");
    } else {
      header.removeClass("fixed");
    }
  });
});
$(document).ready(function () {
  $(".btn[data-tab]").on("click", function () {
    const target = $(this).data("tab");

    $(".btn[data-tab]").removeClass("active");

    $("section[id]").addClass("d-none");

    $(this).addClass("active");

    $("#" + target).removeClass("d-none");
  });
});
$(document).ready(function () {
  // apply saved theme on load
  document.documentElement.dataset.theme =
    localStorage.getItem("theme") || "light";

  // toggle + save
  document.querySelector(".theme-action").onclick = function () {
    const html = document.documentElement;

    html.dataset.theme = html.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", html.dataset.theme);
  };
});

// Prevent checkbox dropdown from closing when clicking on checkboxes
$(document).ready(function () {
  // Stop propagation when clicking inside checkbox dropdown menu (except Filter Now button)
  $(".checkbox-dropdown-menu").on("click", function (e) {
    // If clicked on Filter Now button, allow dropdown to close
    if (
      $(e.target).hasClass("filter-now-btn") ||
      $(e.target).closest(".filter-now-btn").length
    ) {
      return true;
    }
    // Otherwise, prevent dropdown from closing
    e.stopPropagation();
  });

  // Also handle the municipality-zone dropdown
  $(".municipality-zone-menu").on("click", function (e) {
    // If clicked on Filter Now button, allow dropdown to close
    if (
      $(e.target).hasClass("filter-now-btn") ||
      $(e.target).closest(".filter-now-btn").length
    ) {
      return true;
    }
    // Otherwise, prevent dropdown from closing
    e.stopPropagation();
  });
});

$(document).ready(function () {
  function createCylindricalChart(container) {
    // منع التكرار
    if (container.dataset.rendered) return;
    container.dataset.rendered = "true";

    const percent = Math.max(
      0,
      Math.min(100, Number(container.dataset.percent) || 0)
    );

    const svgNS = "http://www.w3.org/2000/svg";

    /* ===== أبعاد SVG الأصلية ===== */
    const SCALE = 2;
    const ORIG_WIDTH = 32;
    const ORIG_HEIGHT = 215;

    const SVG_W = ORIG_WIDTH * SCALE;
    const SVG_H = ORIG_HEIGHT * SCALE;

    const CX = 16 * SCALE;
    const RX = 16 * SCALE;
    const RY = 8 * SCALE;

    const EMPTY_TOP_Y = 8 * SCALE;
    const BODY_HEIGHT = (ORIG_HEIGHT - 8) * SCALE;

    const fillHeight = (percent / 100) * BODY_HEIGHT;

    // 👇 نزول بسيط للغطاء العلوي
    const TOP_OFFSET = 20;
    const fillTopY = SVG_H - fillHeight + TOP_OFFSET;

    /* ===== SVG ===== */
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "pillar-svg");
    svg.setAttribute("viewBox", `0 0 ${SVG_W} ${SVG_H}`);
    svg.setAttribute("width", SVG_W);
    svg.setAttribute("height", SVG_H);

    /* ===== العمود الفارغ ===== */
    const bgGroup = document.createElementNS(svgNS, "g");
    bgGroup.innerHTML = `
    <path class="st0"
      d="M${SVG_W},${EMPTY_TOP_Y}
         v${BODY_HEIGHT}
         H0V${EMPTY_TOP_Y}
         C0,${EMPTY_TOP_Y / 2},${CX - RX},0,${CX},0
         s${RX},${EMPTY_TOP_Y / 2},${RX},${EMPTY_TOP_Y}Z"/>
    <ellipse class="st1"
      cx="${CX}"
      cy="${EMPTY_TOP_Y}"
      rx="${RX}"
      ry="${RY}"/>
  `;

    /* ===== العمود المعبأ ===== */
    const fillGroup = document.createElementNS(svgNS, "g");
    fillGroup.classList.add("fill-group");

    fillGroup.innerHTML = `
    <path class="st2"
      d="M${CX},${SVG_H}
         H0v-${fillHeight - RY}
         c0,${RY * 0.55},${CX - RX},${RY},${CX},${RY}
         s${RX},-${RY * 0.45},${RX},-${RY}
         V${SVG_H}Z"/>
    <ellipse class="st3"
      cx="${CX}"
      cy="${fillTopY}"
      rx="${RX}"
      ry="${RY}"/>
  `;

    svg.append(bgGroup, fillGroup);
    container.appendChild(svg);

    /* ===== أنيميشن ===== */
    requestAnimationFrame(() => {
      fillGroup.style.transform = `scaleY(${percent / 100})`;
    });
  }

  /* ===== تشغيل جميع الأعمدة ===== */
  document
    .querySelectorAll(".cylindrical-pillar-chart")
    .forEach(createCylindricalChart);
});
// Prevent checkbox dropdown from closing when clicking on checkboxes
$(document).ready(function () {
  // Age Group Range Slider Functionality
  // Initialize all range sliders (both dropdown and modal)
  function initRangeSliders() {
    const rangeContainers = document.querySelectorAll(".range-filter-content");

    rangeContainers.forEach((container) => {
      const minSlider = container.querySelector(".range-slider-min");
      const maxSlider = container.querySelector(".range-slider-max");
      const rangeSelected = container.querySelector(".range-selected");
      const rangeDisplay = container.querySelector(".range-display");

      if (!minSlider || !maxSlider || !rangeSelected || !rangeDisplay) return;

      const minValue = parseInt(minSlider.min);
      const maxValue = parseInt(minSlider.max);

      function updateSlider() {
        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);

        // Prevent sliders from crossing
        if (minVal > maxVal) {
          if (this === minSlider) {
            minSlider.value = maxVal;
            minVal = maxVal;
          } else {
            maxSlider.value = minVal;
            maxVal = minVal;
          }
        }

        // Calculate percentages
        const minPercent = ((minVal - minValue) / (maxValue - minValue)) * 100;
        const maxPercent = ((maxVal - minValue) / (maxValue - minValue)) * 100;

        // Update the selected range visual using logical property
        rangeSelected.style.insetInlineStart = minPercent + "%";
        rangeSelected.style.width = maxPercent - minPercent + "%";

        // Update the display text
        const maxDisplayValue = maxVal >= 75 ? "75+" : maxVal;
        rangeDisplay.textContent = minVal + " - " + maxDisplayValue;
      }

      // Initialize
      updateSlider.call(minSlider);

      // Add event listeners
      minSlider.addEventListener("input", updateSlider);
      maxSlider.addEventListener("input", updateSlider);
    });
  }

  // Initialize on page load
  initRangeSliders();

  // Re-initialize when modal is shown (for dynamic content)
  const advanceFilterModal = document.getElementById("advanceFilterModal");
  if (advanceFilterModal) {
    advanceFilterModal.addEventListener("shown.bs.modal", function () {
      initRangeSliders();
    });
  }
});
$(document).ready(function () {
  $('.map-toggle').on('click', function (e) {
    e.preventDefault();
    $('#map-chart, #map-geo').toggle();
  });

  $('.view-indicators').on('click', function (e) {
    e.preventDefault();
    $('.bskets').slideToggle();
  });
});
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))