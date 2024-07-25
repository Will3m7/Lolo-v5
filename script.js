document.addEventListener("DOMContentLoaded", () => {
    const addFeedForm = document.getElementById("addFeedForm");
    const filterSelect = document.getElementById("filterSelect");
    const feedsContainer = document.getElementById("feedsContainer");
    const editModal = document.getElementById("editModal");
    const editModalForm = document.getElementById("editModalForm");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    let feeds = [];

    addFeedForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const feedUrl = document.getElementById("feedUrl").value;
        const category = document.getElementById("category").value;
        addFeed(feedUrl, category);
        addFeedForm.reset();
    });

    filterSelect.addEventListener("change", () => {
        displayFeeds();
    });

    modalCloseBtn.addEventListener("click", () => {
        editModal.style.display = "none";
    });

    editModalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const feedUrl = document.getElementById("editFeedUrl").value;
        const category = document.getElementById("editCategory").value;
        updateFeed(feedUrl, category);
    });

    function addFeed(feedUrl, category) {
        feeds.push({ url: feedUrl, category: category });
        updateFilterOptions();
        displayFeeds();
    }

    function removeFeed(feedUrl) {
        feeds = feeds.filter(feed => feed.url !== feedUrl);
        updateFilterOptions();
        displayFeeds();
    }

    function updateFeed(feedUrl, category) {
        feeds = feeds.map(feed => {
            if (feed.url === feedUrl) {
                return { url: feedUrl, category: category };
            }
            return feed;
        });
        editModal.style.display = "none";
        displayFeeds();
    }

    function updateFilterOptions() {
        const categories = [...new Set(feeds.map(feed => feed.category))];
        filterSelect.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
    }

    async function fetchParsedArticle(url) {
        try {
            const response = await fetch('https://uptime-mercury-api.azurewebsites.net/webparser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                console.error('Failed to fetch the parsed article:', response.statusText);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function displayFeeds() {
        feedsContainer.innerHTML = '';
        const filter = filterSelect.value;
        const filteredFeeds = filter === 'all' ? feeds : feeds.filter(feed => feed.category === filter);

        for (const feed of filteredFeeds) {
            const articleData = await fetchParsedArticle(feed.url);
            if (articleData) {
                const feedElement = document.createElement("div");
                feedElement.className = "feed";

                const articleElement = document.createElement("li");
                articleElement.innerHTML = `
                    <h3>${articleData.title}</h3>
                    <time>${new Date(articleData.date_published).toLocaleString()}</time>
                    <a href="${articleData.url}" target="_blank">Read more</a>
                    <div class="article-content">${articleData.content}</div>
                `;

                feedElement.appendChild(articleElement);

                const removeButton = document.createElement("button");
                removeButton.className = "remove-feed";
                removeButton.textContent = "Remove";
                removeButton.addEventListener("click", () => removeFeed(feed.url));

                feedElement.appendChild(removeButton);

                feedsContainer.appendChild(feedElement);
            }
        }
    }

    // Initial call to display feeds
    displayFeeds();
});
