document.addEventListener('DOMContentLoaded', function () {
    const addFeedForm = document.getElementById('addFeedForm');
    const feedsContainer = document.getElementById('feedsContainer');
    const filterSelect = document.getElementById('filterSelect');
    const modal = document.getElementById('editModal');
    const modalForm = document.getElementById('editModalForm');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

    // Function to fetch and parse RSS feed
    async function fetchRSSFeed(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'application/xml');
            const items = xmlDoc.getElementsByTagName('item');
            return Array.from(items).map(item => ({
                title: item.getElementsByTagName('title')[0]?.textContent || 'No title',
                link: item.getElementsByTagName('link')[0]?.textContent || 'No link',
                pubDate: item.getElementsByTagName('pubDate')[0]?.textContent || 'No pubDate',
                description: item.getElementsByTagName('description')[0]?.textContent || 'No description',
                category: item.getElementsByTagName('category')[0]?.textContent || 'Uncategorized',
                imageUrl: item.getElementsByTagName('media:content')[0]?.getAttribute('url') || 'No image',
                author: item.getElementsByTagName('author')[0]?.textContent || 'Unknown',
                source: item.getElementsByTagName('source')[0]?.getAttribute('url') || 'Unknown',
            }));
        } catch (error) {
            console.error('Error fetching RSS feed:', error);
            return [];
        }
    }

    // Function to fetch and parse article content using the proxy server
    async function fetchArticleContent(url) {
        try {
            const response = await fetch('https://proxyserver-bice.vercel.app/webparser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return {
                title: data.title || 'No title',
                content: data.content || '<p>Unable to load content.</p>',
                imageUrl: data.lead_image_url || 'No image',
                excerpt: data.excerpt || 'No excerpt',
                url: data.url || url,
            };
        } catch (error) {
            console.error('Error fetching article content:', error);
            return {
                title: 'Error',
                content: '<p>Unable to load content.</p>',
                imageUrl: 'No image',
                excerpt: 'Error loading content.',
                url: url,
            };
        }
    }

    // Function to check if URL is RSS feed
    function isRSSFeed(url) {
        return url.endsWith('.rss') || url.includes('/feed/');
    }

    // Function to fetch and parse RSS feed or webpage
    async function fetchAndDisplayContent(url) {
        if (isRSSFeed(url)) {
            const items = await fetchRSSFeed(url);
            return items;
        } else {
            const content = await fetchArticleContent(url);
            return [content]; // Return as an array with one item
        }
    }

    function saveFeeds() {
        localStorage.setItem('feeds', JSON.stringify(feeds));
    }

    async function renderFeeds() {
        feedsContainer.innerHTML = '';
        for (const feed of feeds) {
            const feedElement = document.createElement('div');
            feedElement.classList.add('feed');

            feedElement.innerHTML = `
                <h3>${feed.category}</h3>
                <ul>
                    ${feed.items.map(item => `
                        <li>
                            <div class="article-header">
                                <h4><a href="${item.link}" target="_blank">${item.title} - Feed</a></h4>
                                ${item.imageUrl ? `<a href="${item.link}" target="_blank"><img src="${item.imageUrl}" alt="${item.title}" class="article-image"></a>` : ''}
                            </div>
                            <p>${item.description}</p>
                            <a href="${item.link}" target="_blank">Read More</a>
                            <time>${new Date(item.pubDate).toLocaleString()}</time>
                            <p>Author: ${item.author}</p>
                            <p>Source: ${item.source}</p>
                        </li>
                    `).join('')}
                </ul>
                <button class="edit-feed" data-url="${feed.url}">Edit Feed</button>
                <button class="remove-feed" data-url="${feed.url}">Remove Feed</button>
            `;

            feedsContainer.appendChild(feedElement);
        }
        saveFeeds();
    }

    function renderFilterOptions() {
        const categories = feeds.flatMap(feed => feed.items.map(item => item.category));
        const uniqueCategories = [...new Set(categories.filter(category => category))];

        filterSelect.innerHTML = `
            <option value="all">All Categories</option>
            ${uniqueCategories.map(category => `
                <option value="${category}">${category}</option>
            `).join('')}
        `;
    }

    function openEditModal(feedUrl, category) {
        modal.style.display = 'block';
        modalForm.dataset.url = feedUrl;
        document.getElementById('editFeedUrl').value = feedUrl;
        document.getElementById('editCategory').value = category;
    }

    function closeEditModal() {
        modal.style.display = 'none';
    }

    addFeedForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const feedUrl = document.getElementById('feedUrl').value.trim();
        const category = document.getElementById('category').value.trim();

        if (feedUrl && category) {
            const items = await fetchAndDisplayContent(feedUrl);
            if (items.length === 0) return; // Skip if no items are returned

            const existingFeedIndex = feeds.findIndex(feed => feed.url === feedUrl);

            if (existingFeedIndex !== -1) {
                feeds[existingFeedIndex] = { url: feedUrl, category: category, items: items };
            } else {
                feeds.push({ url: feedUrl, category: category, items: items });
            }

            await renderFeeds();
            renderFilterOptions();
            addFeedForm.reset();
        } else {
            alert('Please provide both a feed URL and a category.');
        }
    });

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

    modalForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const feedUrl = modalForm.dataset.url;
        const newFeedUrl = document.getElementById('editFeedUrl').value.trim();
        const newCategory = document.getElementById('editCategory').value.trim();

        if (newFeedUrl && newCategory) {
            const items = await fetchAndDisplayContent(newFeedUrl);
            if (items.length === 0) return; // Skip if no items are returned

            const existingFeedIndex = feeds.findIndex(feed => feed.url === feedUrl);

            if (existingFeedIndex !== -1) {
                feeds[existingFeedIndex] = { url: newFeedUrl, category: newCategory, items: items };
                closeEditModal();
                await renderFeeds();
                renderFilterOptions();
            }
        } else {
            alert('Please provide both a feed URL and a category.');
        }
    });

    modalCloseBtn.addEventListener('click', closeEditModal);

    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeEditModal();
        }
    });

    filterSelect.addEventListener('change', function () {
        const selectedCategory = filterSelect.value;
        const feedElements = feedsContainer.querySelectorAll('.feed');

        feedElements.forEach(feedElement => {
            const items = feedElement.querySelectorAll('li');
            items.forEach(item => {
                const category = item.querySelector('.category')?.textContent;
                if (selectedCategory === 'all' || category === selectedCategory) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Initial rendering
    renderFeeds();
    renderFilterOptions();
});
