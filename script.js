// ================= MENU =================

const menuIcon = document.getElementById("menuIcon");
const dropdownMenu = document.getElementById("dropdownMenu");

if (menuIcon && dropdownMenu) {

    function toggleMenu() {
        dropdownMenu.classList.toggle("show");
    }

    menuIcon.addEventListener("click", toggleMenu);

    dropdownMenu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            dropdownMenu.classList.remove("show");
        });
    });

    document.addEventListener("click", function (event) {

        if (!event.target.closest(".dropdown")) {
            dropdownMenu.classList.remove("show");
        }

    });
}


// ================= REVEAL ANIMATION =================

const observer = new IntersectionObserver(function (entries) {

    entries.forEach(function (entry) {

        if (entry.isIntersecting) {

            entry.target.classList.add("show");

            observer.unobserve(entry.target);
        }

    });

}, {
    threshold: 0.15
});


document.querySelectorAll(".reveal").forEach(function (element) {
    observer.observe(element);
});


// ================= SEARCH =================

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchMessage = document.getElementById("search-message");


const plants = [
    {
        name: "periwinkle",
        file: "periwinkle.html"
    },
    {
        name: "mango",
        file: "mango.html"
    },
    {
        name: "sunflower",
        file: "sunflower.html"
    },
    {
        name: "rose",
        file: "rose.html"
    },
    {
        name: "marigold",
        file: "marigold.html"
    },
    {
        name: "ixora",
        file: "ixora.html"
    }
];
const suggestions = document.getElementById("suggestions");

if (searchInput && suggestions) {

    searchInput.addEventListener("input", function () {

        const query = searchInput.value.trim().toLowerCase();

        suggestions.innerHTML = "";

        if (query === "") {
            suggestions.classList.remove("show");
            return;
        }

        const matches = plants.filter(function (plant) {
            return plant.name.toLowerCase().includes(query);
        });

        if (matches.length === 0) {
            suggestions.classList.remove("show");
            return;
        }

        matches.forEach(function (plant) {

            const item = document.createElement("div");

            item.classList.add("suggestion-item");
            item.textContent = plant.name;

            item.addEventListener("click", function () {
                window.location.href = plant.file;
            });

            suggestions.appendChild(item);
        });

        suggestions.classList.add("show");

    });


    document.addEventListener("click", function (event) {

        if (!event.target.closest(".search-container")) {
            suggestions.classList.remove("show");
        }

    });

}
if (searchForm && searchInput && searchMessage) {

    searchForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const query = searchInput.value.trim().toLowerCase();

        if (query === "") {
            searchMessage.textContent =
                "Please enter a plant name.";
            return;
        }

        const results = plants.filter(function (plant) {
            return (
                plant.name.includes(query)
            );
        });


        if (results.length === 1) {

            window.location.href = results[0].file;

        }

        else if (results.length > 1) {

            searchMessage.innerHTML = "";

            results.forEach(function (plant) {

                const link = document.createElement("a");

                link.href = plant.file;
                link.textContent = plant.name;

                searchMessage.appendChild(link);

                searchMessage.appendChild(
                    document.createElement("br")
                );

            });

        }

        else {

            searchMessage.textContent =
                "No plants found. Try another name.";

        }

    });

}
