document.addEventListener('DOMContentLoaded', function () {
    const addFeedForm = document.getElementById('addFeedForm');
    const feedsContainer = document.getElementById('feedsContainer');
    const filterSelect = document.getElementById('filterSelect');
    const articleModal = document.getElementById('articleModal');
    const modalContent = document.getElementById('modalContent');
    const editModal = document.getElementById('editModal');
    const editFeedForm = document.getElementById('editFeedForm');

    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];

    async function fetchRSSFeed(url) {
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
                source: url,
            }));
        } catch (error) {
            console.error('Error fetching RSS feed:', error);
            alert('Failed to fetch RSS feed. Please check the URL or try another feed.');
            return [];
        }
    }

    async function fetchArticleContent(url) {
        try {
            const response = await fetch('https://uptime-mercury-api.azurewebsites.net/webparser', {
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

    async function displayArticleContent(url) {
        const content = await fetchArticleContent(url);
        modalContent.innerHTML = `
            <h2>${content.title}</h2>
            ${content.content}
        `;
        articleModal.style.display = 'block';
    }

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