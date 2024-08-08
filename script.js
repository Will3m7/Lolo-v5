document.addEventListener('DOMContentLoaded', () => {
    let feeds = JSON.parse(localStorage.getItem('feeds')) || [];




  // Function to fetch and display content from the proxy server
async function fetchAndDisplayContent(url) {
    try {
      const response = await fetch('https://proxyserver-bice.vercel.app/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      displayContent(data.content);
    } catch (error) {
      console.error('Error fetching content:', error);
      displayContent('<p>Unable to load content.</p>');
    }
  }
  
  // Function to display the content in the HTML page
  function displayContent(content) {
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = content;
  
    // Show the modal
    const modal = document.getElementById('articleModal');
    modal.style.display = 'block';
  
    // Add event listener to close the modal
    document.querySelectorAll('.modal .close').forEach((closeBtn) => {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    });
  }
  
  // Event listener for the "Add Feed" form submission
  document.getElementById('addFeedForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedUrl = document.getElementById('feedUrl').value;
    const category = document.getElementById('category').value;
  
    if (feedUrl && category) {
      await fetchAndDisplayContent(feedUrl);
      // You can also save the feed information to localStorage or update the feed list
    }
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
            await fetchAndDisplayContent(feed.link);
        });

        const image = document.createElement('img');
        image.src = feed.imageUrl;
        image.classList.add('article-image');
        image.addEventListener('click', () => {
            fetchAndDisplayContent(feed.link);
        });

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
    function displayContent(content) {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = content;
      
        const modal = document.getElementById('articleModal');
        modal.style.display = 'block';
      
        document.querySelectorAll('.modal .close').forEach((closeBtn) => {
          closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
          });
        });
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