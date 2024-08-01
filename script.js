document.addEventListener('DOMContentLoaded', function () {
    const addFeedForm = document.getElementById('addFeedForm');
    const feedsContainer = document.getElementById('feedsContainer');
    const filterSelect = document.getElementById('filterSelect');
    const articleModal = document.getElementById('articleModal');
    const modalContent = document.getElementById('modalContent');
    const editModal = document.getElementById('editModal');
    const editFeedForm = document.getElementById('editFeedForm');

    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

    // Function to fetch and parse RSS feed
    async function fetchRSSFeed(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'application/xml');
            const items = xmlDoc.getElementsByTagName('item');
            
            if (items.length === 0) {
                throw new Error('No items found in the RSS feed.');
            }

            return Array.from(items).map(item => ({
                title: item.getElementsByTagName('title')[0]?.textContent || 'No title',
                link: item.getElementsByTagName('link')[0]?.textContent || '#',
                pubDate: item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toUTCString(),
                description: item.getElementsByTagName('description')[0]?.textContent || 'No description',
                category: item.getElementsByTagName('category')[0]?.textContent || 'Uncategorized',
                imageUrl: item.getElementsByTagName('media:content')[0]?.getAttribute('url') || '',
                author: item.getElementsByTagName('author')[0]?.textContent || 'Unknown',
                source: url,
            }));
        } catch (error) {
            console.error('Error fetching RSS feed:', error);
            alert('Failed to fetch RSS feed. Please check the URL or try another feed.');
            return [];
        }
    }

    // Function to fetch article content using the proxy server
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

            return await response.json();
        } catch (error) {
            console.error('Error fetching article content:', error);
            return {
                title: 'Error',
                content: '<p>Unable to load content.</p>',
                url: url,
            };
        }
    }

    function saveFeeds() {
        localStorage.setItem('feeds', JSON.stringify(feeds));
    }

    function sortArticlesByDate(articles) {
        return articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }

    async function renderFeeds() {
        feedsContainer.innerHTML = '';
        const allArticles = feeds.flatMap(feed => feed.items.map(item => ({ ...item, feedCategory: feed.category })));
        const sortedArticles = sortArticlesByDate(allArticles);

        for (const article of sortedArticles) {
            const articleElement = document.createElement('article');
            articleElement.classList.add('feed-item');
            articleElement.dataset.category = article.category;

            articleElement.innerHTML = `
                <h3><a href="#" class="article-link" data-url="${article.link}">${article.title}</a></h3>
                ${article.imageUrl ? `<img src="${article.imageUrl}" alt="${article.title}" class="article-image">` : ''}
                <p>${article.description}</p>
                <div class="article-meta">
                    <span>Category: ${article.category}</span>
                    <span>Feed: ${article.feedCategory}</span>
                    <span>Published: ${new Date(article.pubDate).toLocaleString()}</span>
                    <span>Author: ${article.author}</span>
                </div>
            `;

            feedsContainer.appendChild(articleElement);
        }

        saveFeeds();
        renderFilterOptions();
    }

    function renderFilterOptions() {
        const categories = [...new Set(feeds.flatMap(feed => feed.items.map(item => item.category)))];
        filterSelect.innerHTML = `
            <option value="all">All Categories</option>
            ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
        `;
    }

    function filterArticles() {
        const selectedCategory = filterSelect.value;
        const articles = document.querySelectorAll('.feed-item');
        articles.forEach(article => {
            if (selectedCategory === 'all' || article.dataset.category === selectedCategory) {
                article.style.display = 'block';
            } else {
                article.style.display = 'none';
            }
        });
    }

    async function addFeed(url, category) {
        const items = await fetchRSSFeed(url);
        if (items.length === 0) return;

        const existingFeedIndex = feeds.findIndex(feed => feed.url === url);
        if (existingFeedIndex !== -1) {
            feeds[existingFeedIndex] = { url, category, items };
        } else {
            feeds.push({ url, category, items });
        }

        await renderFeeds();
    }

    function removeFeed(url) {
        feeds = feeds.filter(feed => feed.url !== url);
        renderFeeds();
    }

    function openEditModal(url) {
        const feed = feeds.find(feed => feed.url === url);
        if (feed) {
            document.getElementById('editFeedUrl').value = feed.url;
            document.getElementById('editCategory').value = feed.category;
            editModal.style.display = 'block';
            editFeedForm.dataset.originalUrl = url;
        }
    }

    async function displayArticleContent(url) {
        const content = await fetchArticleContent(url);
        modalContent.innerHTML = `
            <h2>${content.title}</h2>
            ${content.content}
        `;
        articleModal.style.display = 'block';
    }

    // Event Listeners
    addFeedForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const feedUrl = document.getElementById('feedUrl').value.trim();
        const category = document.getElementById('category').value.trim();
        if (feedUrl && category) {
            await addFeed(feedUrl, category);
            addFeedForm.reset();
        }
    });

    editFeedForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const originalUrl = editFeedForm.dataset.originalUrl;
        const newUrl = document.getElementById('editFeedUrl').value.trim();
        const newCategory = document.getElementById('editCategory').value.trim();
        if (newUrl && newCategory) {
            removeFeed(originalUrl);
            await addFeed(newUrl, newCategory);
            editModal.style.display = 'none';
        }
    });

    filterSelect.addEventListener('change', filterArticles);

    feedsContainer.addEventListener('click', async function (event) {
        if (event.target.classList.contains('article-link')) {
            event.preventDefault();
            const url = event.target.dataset.url;
            await displayArticleContent(url);
        }
    });

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Initial load
    (async function init() {
        if (feeds.length === 0) {
            await addFeed('https://flipboard.com/@raimoseero/feed-nii8kd0sz.rss', 'Initial Feed');
        }
        await renderFeeds();
    })();
});


    // Initialize feeds from localStorage if available
    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

    // Function to fetch and parse RSS feed
    async function fetchRSS(url) {
        try {
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
            const data = await response.json();
            return data.items.map(item => ({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                description: item.description,
                category: item.categories ? item.categories.join(', ') : 'Uncategorized',
                imageUrl: item.enclosure ? item.enclosure.link : (item['media:content'] ? item['media:content'].url : null),
                author: item.author,
                source: item.source,
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
                                    <h4><a href="${item.link}" target="_blank">${item.title} -Feed</a></h4>
                                    ${item.imageUrl ? `<a href="${item.link}" target="_blank"><img src="${item.imageUrl}" alt="${item.title}" class="article-image"></a>` : ''}
                                </div>
                                <p>${item.description}</p>
                                <a href="${item.link}" target="_blank">Read More</a>
                                <time>${new Date(item.pubDate).toLocaleString()}</time>
                                <div class="article-content">${content}</div>
                                <p>Author: ${item.author || 'Unknown'}</p>
                                <p>Source: ${item.source || 'Unknown'}</p>
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
        const categories = feeds.flatMap(feed => feed.items.map(item => item.category));
        const uniqueCategories = [...new Set(categories.filter(category => category))]; // Get unique categories and filter out empty ones

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
            const filteredFeeds = feeds.flatMap(feed => feed.items.filter(item => item.category.includes(selectedCategory)));
            feedsContainer.innerHTML = '';
            for (const feed of filteredFeeds) {
                const feedElement = document.createElement('div');
                feedElement.classList.add('feed');

                feedElement.innerHTML = `
                    <div class="article-header">
                        <h4><a href="${feed.link}" target="_blank">${feed.title} -Feed</a></h4>
                        ${feed.imageUrl ? `<a href="${feed.link}" target="_blank"><img src="${feed.imageUrl}" alt="${feed.title}" class="article-image"></a>` : ''}
                    </div>
                    <p>${feed.description}</p>
                    <a href="${feed.link}" target="_blank">Read More</a>
                    <time>${new Date(feed.pubDate).toLocaleString()}</time>
                `;
                feedsContainer.appendChild(feedElement);
            }
        }
    });

    // Initial render of feeds and filter options
    renderFeeds();
    renderFilterOptions();


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
                link: item.link,
                pubDate: item.pubDate,
                description: item.description,
                category: item.categories ? item.categories.join(', ') : 'Uncategorized',
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
                                    <h4><a href="${item.link}" target="_blank">${item.title} -Feed</a></h4>
                                    ${item.imageUrl ? `<a href="${item.link}" target="_blank"><img src="${item.imageUrl}" alt="${item.title}" class="article-image"></a>` : ''}
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
        const categories = feeds.flatMap(feed => feed.items.map(item => item.category));
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
            const filteredFeeds = feeds.flatMap(feed => feed.items.filter(item => item.category.includes(selectedCategory)));
            feedsContainer.innerHTML = '';
            for (const feed of filteredFeeds) {
                const feedElement = document.createElement('div');
                feedElement.classList.add('feed');

                feedElement.innerHTML = `
                    <div class="article-header">
                        <h4><a href="${feed.link}" target="_blank">${feed.title} -Feed</a></h4>
                        ${feed.imageUrl ? `<a href="${feed.link}" target="_blank"><img src="${feed.imageUrl}" alt="${feed.title}" class="article-image"></a>` : ''}
                    </div>
                    <p>${feed.description}</p>
                    <a href="${feed.link}" target="_blank">Read More</a>
                    <time>${new Date(feed.pubDate).toLocaleString()}</time>
                `;
                feedsContainer.appendChild(feedElement);
            }
        }
    });

    // Initial render of feeds and filter options
    renderFeeds();
    renderFilterOptions();

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
                    link: item.link,
                    pubDate: item.pubDate,
                    description: item.description,
                    category: item.categories ? item.categories.join(', ') : 'Uncategorized',
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
                                        <h4><a href="${item.link}" target="_blank">${item.title} -Feed</a></h4>
                                        ${item.imageUrl ? `<a href="${item.link}" target="_blank"><img src="${item.imageUrl}" alt="${item.title}" class="article-image"></a>` : ''}
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
            const categories = feeds.flatMap(feed => feed.items.map(item => item.category));
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
                const filteredFeeds = feeds.flatMap(feed => feed.items.filter(item => item.category.includes(selectedCategory)));
                feedsContainer.innerHTML = '';
                for (const feed of filteredFeeds) {
                    const feedElement = document.createElement('div');
                    feedElement.classList.add('feed');
    
                    feedElement.innerHTML = `
                        <div class="article-header">
                            <h4><a href="${feed.link}" target="_blank">${feed.title} -Feed</a></h4>
                            ${feed.imageUrl ? `<a href="${feed.link}" target="_blank"><img src="${feed.imageUrl}" alt="${feed.title}" class="article-image"></a>` : ''}
                        </div>
                        <p>${feed.description}</p>
                        <a href="${feed.link}" target="_blank">Read More</a>
                        <time>${new Date(feed.pubDate).toLocaleString()}</time>
                    `;
                    feedsContainer.appendChild(feedElement);
                }
            }
        });
    
        // Initial render of feeds and filter options
        renderFeeds();
        renderFilterOptions();
    });
    
});
