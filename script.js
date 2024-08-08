document.addEventListener('DOMContentLoaded', () => {
    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

// Function to fetch and parse data using the proxy server
async function fetchFromProxy(url, isRSS = false) {
    try {
        const response = await fetch('https://proxyserver-bice.vercel.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (isRSS) {
            const data = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'application/xml');
            const items = xmlDoc.getElementsByTagName('item');

            // Parse RSS items into an array of objects
            return Array.from(items).map(item => ({
                title: item.getElementsByTagName('title')[0].textContent,
                link: item.getElementsByTagName('link')[0].textContent,
                description: item.getElementsByTagName('description')[0].textContent,
                pubDate: item.getElementsByTagName('pubDate')[0].textContent
            }));
        } else {
            const data = await response.json();
            return data.content; // Assuming 'content' contains the HTML content to display
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return isRSS ? [] : '<p>Unable to load content.</p>';
    }
}

// Function to display fetched content on the webpage
function displayContent(content, isRSS = false) {
    const container = document.getElementById('feedsContainer');

    if (isRSS) {
        // Clear previous content
        container.innerHTML = '';
        
        // Create HTML for each RSS item
        content.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'feed-item';

            itemElement.innerHTML = `
                <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
                <p>${item.description}</p>
                <small>${item.pubDate}</small>
            `;

            container.appendChild(itemElement);
        });
    } else {
        // Directly display non-RSS content
        container.innerHTML = content;
    }
}

// Example usage (assuming the URL and category are provided by the user via a form)
document.getElementById('addFeedForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const url = document.getElementById('feedUrl').value;
    const category = document.getElementById('category').value;
    
    const isRSS = url.endsWith('.xml'); // Simple check for RSS feeds
    const content = await fetchFromProxy(url, isRSS);
    
    displayContent(content, isRSS);
});



document.addEventListener('DOMContentLoaded', () => {
    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

    // Function to fetch and parse data using the proxy server
    async function fetchFromProxy(url, isRSS = false) {
        try {
            const response = await fetch('https://proxyserver-bice.vercel.app', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ url: url }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            if (isRSS) {
                const data = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data, 'application/xml');
                const items = xmlDoc.getElementsByTagName('item');

                return Array.from(items).map(item => ({
                    // ... (existing feed item mapping)
                }));
            } else {
                const data = await response.json();
                console.log('Fetched data:', data);
                return data.content;
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            return isRSS ? [] : '<p>Unable to load content.</p>';
        }
    }

    // ... (existing code)

    // Event listener for adding new feed
    document.getElementById('addFeedForm').addEventListener('submit', async event => {
        event.preventDefault();
        const feedUrl = document.getElementById('feedUrl').value;
        const category = document.getElementById('category').value;

        if (feedUrl && category) {
            const newFeeds = await fetchFromProxy(feedUrl, true);
            feeds.push(...newFeeds.map(feed => ({ ...feed, category })));
            localStorage.setItem('feeds', JSON.stringify(feeds));
            renderFeeds();
            renderFilterOptions();
        }
    });

    // ... (existing code)
});

    // Function to render the feeds
    function renderFeeds() {
        const feedsContainer = document.getElementById('feedsContainer');
        feedsContainer.innerHTML = '';

        const selectedCategory = document.getElementById('filterSelect').value;
        const filteredFeeds = selectedCategory === 'All' ? feeds : feeds.filter(feed => feed.category === selectedCategory);

        filteredFeeds.forEach(feed => {
            const feedItem = document.createElement('div');
            feedItem.classList.add('feed-item');

            const title = document.createElement('h3');
            title.textContent = `${feed.title} - Feed`;
            title.addEventListener('click', async () => {
                const content = await fetchFromProxy(feed.link);
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

            feedItem.append(title, image, description, meta);
            feedsContainer.appendChild(feedItem);
        });
    }

    // Function to render filter options based on categories
    function renderFilterOptions() {
        const filterSelect = document.getElementById('filterSelect');
        const categories = ['All', ...new Set(feeds.map(feed => feed.category))];

        filterSelect.innerHTML = categories.map(category => 
            `<option value="${category}">${category}</option>`
        ).join('');
    }

    // Function to show modal with content
    function showModal(content) {
        const modal = document.getElementById('articleModal');
        document.getElementById('modalContent').innerHTML = content;
        modal.style.display = 'block';
    }

    // Event listeners for modal close buttons
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });

    // Event listener for adding new feed
    document.getElementById('addFeedForm').addEventListener('submit', async event => {
        event.preventDefault();
        const feedUrl = document.getElementById('feedUrl').value;
        const category = document.getElementById('category').value;

        if (feedUrl && category) {
            const newFeeds = await fetchFromProxy(feedUrl, true);
            feeds.push(...newFeeds.map(feed => ({ ...feed, category })));
            localStorage.setItem('feeds', JSON.stringify(feeds));
            renderFeeds();
            renderFilterOptions();
        }
    });

    // Initial rendering
    renderFeeds();
    renderFilterOptions();

    // Event listener for filter change
    document.getElementById('filterSelect').addEventListener('change', renderFeeds);
});