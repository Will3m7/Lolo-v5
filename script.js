const Mercury = require('@postlight/mercury-parser');

Parser.parse("https://www.err.ee/").then(result => console.log(result));
console.log("smins");
document.addEventListener('DOMContentLoaded', function () {
    const addFeedForm = document.getElementById('addFeedForm');
    const feedsContainer = document.getElementById('feedsContainer');
    const filterSelect = document.getElementById('filterSelect');
    const modal = document.getElementById('editModal');
    const modalForm = document.getElementById('editModalForm');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // Initialize feeds from localStorage if available
    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

    // Function to fetch and parse RSS feed
    async function fetchRSS(url) {
        try {
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
            const data = await response.json();
            return data.items.map(item => ({
                title: item.title,
                description: item.description,
                link: item.link,
                pubDate: item.pubDate,
                imageUrl: item.enclosure ? item.enclosure.link : (item['media:content'] ? item['media:content'].url : null)
            }));
        } catch (error) {
            console.error('Error fetching RSS feed:', error);
            return [];
        }
    }

    // Function to fetch and parse article content using Mercury API
    async function fetchArticleContent(url) {
        try {
            const response = await fetch('https://uptime-mercury-api.azurewebsites.net/webparser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url }),
            });
            const data = await response.json();
            return data.content;
        } catch (error) {
            console.error('Error fetching article content:', error);
            return '<p>Unable to load content.</p>';
        }
    }

    // Function to save feeds to localStorage
    function saveFeeds() {
        localStorage.setItem('feeds', JSON.stringify(feeds));
    }

    // Function to render feeds
    async function renderFeeds() {
        feedsContainer.innerHTML = '';
        for (const feed of feeds) {
            const feedElement = document.createElement('div');
            feedElement.classList.add('feed');

            // Display feed information
            feedElement.innerHTML = `
                <h3>${feed.category}</h3>
                <ul>
                    ${await Promise.all(feed.items.map(async (item) => {
                        const content = await fetchArticleContent(item.link);
                        return `
                            <li>
                                <div class="article-header">
                                     <h4><a href="${item.link}" target="_blank">${item.title}</a></h4>
                                        <div>
                                            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="article-image">` : ''}
                                        </div>
                                </div>
                                <p>${item.description}</p>
                                <a href="${item.link}" target="_blank">Read More</a>
                                <time>${new Date(item.pubDate).toLocaleString()}</time>
                                <div class="article-content">${content}</div>
                            </li>
                        `;
                    })).then(items => items.join(''))}
                </ul>
                <button class="edit-feed" data-url="${feed.url}">Edit Feed</button>
                <button class="remove-feed" data-url="${feed.url}">Remove Feed</button>
            `;

            feedsContainer.appendChild(feedElement);
        }
        saveFeeds(); // Save feeds after rendering
    }

    // Function to render filter options
    function renderFilterOptions() {
        const categories = feeds.map(feed => feed.category);
        const uniqueCategories = [...new Set(categories)]; // Get unique categories

        filterSelect.innerHTML = `
            <option value="all">All Categories</option>
            ${uniqueCategories.map(category => `
                <option value="${category}">${category}</option>
            `).join('')}
        `;
    }

    // Function to open edit modal with existing feed details
    function openEditModal(feedUrl, category) {
        modal.style.display = 'block';
        modalForm.dataset.url = feedUrl;
        document.getElementById('editFeedUrl').value = feedUrl;
        document.getElementById('editCategory').value = category;
    }

    // Function to close edit modal
    function closeEditModal() {
        modal.style.display = 'none';
    }

    // Event listener for form submission to add or edit feed
    addFeedForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const feedUrl = document.getElementById('feedUrl').value.trim();
        const category = document.getElementById('category').value.trim();

        if (feedUrl && category) {
            const items = await fetchRSS(feedUrl);
            const existingFeedIndex = feeds.findIndex(feed => feed.url === feedUrl);

            if (existingFeedIndex !== -1) {
                // Edit existing feed
                feeds[existingFeedIndex] = { url: feedUrl, category: category, items: items };
            } else {
                // Add new feed
                feeds.push({ url: feedUrl, category: category, items: items });
            }

            await renderFeeds();
            renderFilterOptions();
            addFeedForm.reset();
        } else {
            alert('Please provide both a feed URL and a category.');
        }
    });

    // Event delegation for removing or editing feeds
    feedsContainer.addEventListener('click', async function (event) {
        const target = event.target;
        if (target.classList.contains('remove-feed')) {
            const urlToRemove = target.getAttribute('data-url');
            feeds = feeds.filter(feed => feed.url !== urlToRemove);
            await renderFeeds();
            renderFilterOptions();
        } else if (target.classList.contains('edit-feed')) {
            const urlToEdit = target.getAttribute('data-url');
            const feedToEdit = feeds.find(feed => feed.url === urlToEdit);
            if (feedToEdit) {
                openEditModal(feedToEdit.url, feedToEdit.category);
            }
        }
    });

    // Event listener for editing feed in modal
    modalForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const feedUrl = modalForm.dataset.url;
        const newFeedUrl = document.getElementById('editFeedUrl').value.trim();
        const newCategory = document.getElementById('editCategory').value.trim();

        if (newFeedUrl && newCategory) {
            const items = await fetchRSS(newFeedUrl);
            const existingFeedIndex = feeds.findIndex(feed => feed.url === feedUrl);

            if (existingFeedIndex !== -1) {
                // Update existing feed
                feeds[existingFeedIndex] = { url: newFeedUrl, category: newCategory, items: items };
                closeEditModal();
                await renderFeeds();
                renderFilterOptions();
            }
        } else {
            alert('Please provide both a feed URL and a category.');
        }
    });

    // Event listener to close modal
    modalCloseBtn.addEventListener('click', function () {
        closeEditModal();
    });

    // Event listener for filtering articles based on category
    filterSelect.addEventListener('change', async function () {
        const selectedCategory = filterSelect.value;
        if (selectedCategory === 'all') {
            await renderFeeds();
        } else {
            const filteredFeeds = feeds.filter(feed => feed.category === selectedCategory);
            feedsContainer.innerHTML = '';
            for (const feed of filteredFeeds) {
                const feedElement = document.createElement('div');
                feedElement.classList.add('feed');

                feedElement.innerHTML = `
                    <h3>${feed.category}</h3>
                    <ul>
                        ${await Promise.all(feed.items.map(async (item) => {
                            const content = await fetchArticleContent(item.link);
                            return `
                                <li>
                                    <div class="article-header">
                                        <h4><a href="${item.link}" target="_blank">${item.title}</a></h4>
                                        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="article-image">` : ''}
                                    </div>
                                    <p>${item.description}</p>
                                    <a href="${item.link}" target="_blank">Read More</a>
                                    <time>${new Date(item.pubDate).toLocaleString()}</time>
                                    <div class="article-content">${content}</div>
                                </li>
                            `;
                        })).then(items => items.join(''))}
                    </ul>
                    <button class="edit-feed" data-url="${feed.url}">Edit Feed</button>
                    <button class="remove-feed" data-url="${feed.url}">Remove Feed</button>
                `;

                feedsContainer.appendChild(feedElement);
            }
        }
    });

    // Initial rendering of feeds and filter options
    renderFeeds();
    renderFilterOptions();

});
