document.addEventListener('DOMContentLoaded', () => {
    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

// Function to fetch and parse data using the proxy server
async function fetchFromProxy(url, isRSS = false) {
    try {
        fetch("https://proxyserver-bice.vercel.app")
            .then(res => res.json())
            .then(data=>
        console.log(data)
)
        const response = await fetch('https://proxyserver-bice.vercel.app', { // Make sure the endpoint is correct
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

        if (isRSS) {
            const data = await response.text(); // Get response as text for RSS parsing
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'application/xml');
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
        } else {
            const data = await response.json(); // Get response as JSON for non-RSS
            console.log('Fetched data:', data); // Debugging statement
            return data.content;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return isRSS ? [] : '<p>Unable to load content.</p>';
    }
}


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