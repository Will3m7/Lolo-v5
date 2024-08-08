document.addEventListener('DOMContentLoaded', function () {
    const addFeedForm = document.getElementById('addFeedForm');
    const feedsContainer = document.getElementById('feedsContainer');
    const filterSelect = document.getElementById('filterSelect');
    const modal = document.getElementById('articleModal');
    const modalContent = document.getElementById('modalContent');
    const modalCloseButton = document.querySelector('#articleModal .close');

    // Initialize feeds from localStorage if available
    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

    // Function to fetch and parse RSS feed using the proxy server
    async function fetchAndParseRSS(url) {
        try {
            const response = await fetch('https://proxyserver-bice.vercel.app/webparser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // CORS header to allow all origins
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

    // Function to fetch and parse article content using the proxy server
    async function fetchArticleContent(url) {
        try {
            const response = await fetch('https://proxyserver-bice.vercel.app/webparser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // CORS header to allow all origins
                },
                body: JSON.stringify({ url: url }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data.content; // Return the cleaned-up content
        } catch (error) {
            console.error('Error fetching article content:', error);
            return '<p>Unable to load content.</p>';
        }
    }

    // Function to save feeds to localStorage
    function saveFeeds() {
        localStorage.setItem('feeds', JSON.stringify(feeds));
    }

    // Function to render the feeds
    function renderFeeds() {
        feedsContainer.innerHTML = '';

        const filteredFeeds = feeds.filter(feed => {
            const selectedCategory = filterSelect.value;
            return selectedCategory === 'all' || feed.category === selectedCategory;
        });

        filteredFeeds.forEach(feed => {
            const feedItem = document.createElement('div');
            feedItem.classList.add('feed-item');

            const title = document.createElement('h3');
            title.textContent = feed.title;
            title.addEventListener('click', async () => {
                const content = await fetchArticleContent(feed.link);
                showModal(content);
            });

            const image = document.createElement('img');
            image.src = feed.imageUrl;
            image.classList.add('article-image');
            image.addEventListener('click', () => window.open(feed.link, '_blank'));

            const description = document.createElement('p');
            description.textContent = feed.description;

            const meta = document.createElement('div');
            meta.classList.add('article-meta');
            meta.innerHTML = `<p>Published on: ${feed.pubDate}</p><p>Author: ${feed.author}</p><p>Category: ${feed.category}</p>`;

            feedItem.appendChild(title);
            feedItem.appendChild(image);
            feedItem.appendChild(description);
            feedItem.appendChild(meta);

            feedsContainer.appendChild(feedItem);
        });
    }

    // Function to render filter options based on categories
    function renderFilterOptions() {
        const categories = ['all', ...new Set(feeds.map(feed => feed.category))];

        filterSelect.innerHTML = '';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
    }

    // Function to show modal with content
    function showModal(content) {
        modalContent.innerHTML = content;
        modal.style.display = 'block';
    }

    // Event listener for adding new feed
    addFeedForm.addEventListener('submit', async event => {
        event.preventDefault();
        const feedUrl = document.getElementById('feedUrl').value;
        const category = document.getElementById('category').value;

        if (feedUrl && category) {
            const newFeeds = await fetchAndParseRSS(feedUrl);
            newFeeds.forEach(feed => {
                feeds.push({ ...feed, category });
            });
            saveFeeds();
            renderFeeds();
            renderFilterOptions();
            addFeedForm.reset();
        } else {
            alert('Please provide both a feed URL and a category.');
        }
    });

    // Event listener for filter change
    filterSelect.addEventListener('change', renderFeeds);

    // Event listener for closing the modal
    modalCloseButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Initial rendering
    renderFeeds();
    renderFilterOptions();
});