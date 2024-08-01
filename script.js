document.addEventListener('DOMContentLoaded', function () {
    const addFeedForm = document.getElementById('addFeedForm');
    const feedsContainer = document.getElementById('feedsContainer');
    const filterSelect = document.getElementById('filterSelect');
    const modal = document.getElementById('editModal');
    const modalForm = document.getElementById('editModalForm');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // Initialize feeds from localStorage if available
    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

    // Function to fetch and parse RSS feed using the proxy server
    async function fetchAndParseRSS(url) {
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
    
            const data = await response.text(); // Expect raw text for RSS feeds
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'application/xml'); // Use 'application/xml' for RSS
    
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
                    ${feed.items.map(item => `
                        <li>
                            <div class="article-header">
                                <h4><a href="${item.link}" target="_blank">${item.title} -Feed</a></h4>
                                ${item.imageUrl ? `<a href="${item.link}" target="_blank"><img src="${item.imageUrl}" alt="${item.title}" class="article-image"></a>` : ''}
                            </div>
                            <p>${item.description || item.excerpt}</p>
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
            const items = await fetchAndParseRSS(feedUrl);
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
            const items = await fetchAndParseRSS(newFeedUrl);
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

    // Close modal on close button click
    modalCloseBtn.addEventListener('click', closeEditModal);

    // Close modal on outside click
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeEditModal();
        }
    });

    // Filter articles based on selected category
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

    // Initial render of feeds and filter options
    renderFeeds();
    renderFilterOptions();
});
