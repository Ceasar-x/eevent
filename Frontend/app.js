// EventHub Frontend JavaScript
const API_BASE_URL = 'http://localhost:4000/api';

// =====================================
// UTILITY FUNCTIONS
// =====================================

// Make authenticated requests
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const requestOptions = {
    ...options,
    headers,
  };

  return fetch(`${API_BASE_URL}${url}`, requestOptions);
}

// Show/hide messages
function showMessage(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

function hideMessage(element) {
  if (element) {
    element.style.display = 'none';
  }
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// =====================================
// AUTHENTICATION FUNCTIONS
// =====================================

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const loginBtn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');
  const successDiv = document.getElementById('loginSuccess');
  
  hideMessage(errorDiv);
  hideMessage(successDiv);
  
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing In...';

  try {
    const formData = new FormData(e.target);
    const loginData = Object.fromEntries(formData);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      
      showMessage(successDiv, 'Login successful! Redirecting...');
      
      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else if (data.user.role === 'organizer') {
          window.location.href = 'organizer-dashboard.html';
        } else {
          window.location.href = 'attendee-dashboard.html';
        }
      }, 1500);
    } else {
      showMessage(errorDiv, data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage(errorDiv, 'Network error. Please try again.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

// Handle registration
async function handleRegister(e) {
  e.preventDefault();
  
  const registerBtn = document.getElementById('registerBtn');
  const errorDiv = document.getElementById('registerError');
  const successDiv = document.getElementById('registerSuccess');
  
  hideMessage(errorDiv);
  hideMessage(successDiv);
  
  registerBtn.disabled = true;
  registerBtn.textContent = 'Creating Account...';

  try {
    const formData = new FormData(e.target);
    const registerData = Object.fromEntries(formData);

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(successDiv, `${registerData.role.charAt(0).toUpperCase() + registerData.role.slice(1)} account created successfully! Redirecting to login...`);
      e.target.reset();
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } else {
      showMessage(errorDiv, data.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage(errorDiv, 'Network error. Please try again.');
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = registerBtn.textContent.replace('Creating Account...', 'Create Account');
  }
}

// Check authentication
function checkAuth(requiredRole = null) {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('currentUser');

  if (!token || !user) {
    window.location.href = 'index.html';
    return false;
  }

  try {
    const userData = JSON.parse(user);
    
    if (requiredRole && userData.role !== requiredRole) {
      if (userData.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else if (userData.role === 'organizer') {
        window.location.href = 'organizer-dashboard.html';
      } else {
        window.location.href = 'attendee-dashboard.html';
      }
      return false;
    }

    updateUserInfo(userData);
    return true;
  } catch (error) {
    console.error('Error parsing user data:', error);
    logout();
    return false;
  }
}

// Update user info in header
function updateUserInfo(userData) {
  const userNameElement = document.getElementById('userName');
  const userAvatarElement = document.getElementById('userAvatar');
  
  if (userNameElement) {
    userNameElement.textContent = userData.name;
  }
  
  if (userAvatarElement) {
    userAvatarElement.textContent = userData.name.charAt(0).toUpperCase();
  }
}

// Logout
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

// =====================================
// ATTENDEE DASHBOARD FUNCTIONS
// =====================================

// Load attendee dashboard data
async function loadAttendeeDashboardData() {
  try {
    // Load events count
    const eventsResponse = await fetchWithAuth('/attendees/events');
    const eventsData = await eventsResponse.json();
    
    if (document.getElementById('totalEvents')) {
      document.getElementById('totalEvents').textContent = eventsData.total || 0;
    }

    // Load tickets count
    const ticketsResponse = await fetchWithAuth('/attendees/tickets/mine');
    const ticketsData = await ticketsResponse.json();
    
    if (document.getElementById('totalTickets')) {
      document.getElementById('totalTickets').textContent = ticketsData.total || 0;
    }

    // Load recent events
    if (eventsData.events && eventsData.events.length > 0) {
      const recentEvents = eventsData.events.slice(0, 5);
      if (document.getElementById('recentEvents')) {
        document.getElementById('recentEvents').innerHTML = createEventsTable(recentEvents);
      }
    } else {
      if (document.getElementById('recentEvents')) {
        document.getElementById('recentEvents').innerHTML = '<p>No events available</p>';
      }
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Load events for attendees
async function loadEvents(search = '', category = '') {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);

    const url = `/attendees/events${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();

    if (response.ok && data.events && data.events.length > 0) {
      document.getElementById('eventsList').innerHTML = createEventsTable(data.events, true);
    } else {
      document.getElementById('eventsList').innerHTML = '<p>No events available</p>';
    }
  } catch (error) {
    console.error('Error loading events:', error);
    document.getElementById('eventsList').innerHTML = '<p>Error loading events</p>';
  }
}

// Load categories for dropdown
async function loadCategories() {
  try {
    const response = await fetchWithAuth('/attendees/events');
    const data = await response.json();

    if (response.ok && data.events) {
      const categories = [...new Set(data.events.map(event => event.category).filter(Boolean))];
      const categorySelect = document.getElementById('categorySelect');
      categorySelect.innerHTML = '<option value="">All Categories</option>';
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Load my tickets
async function loadMyTickets() {
  try {
    const response = await fetchWithAuth('/attendees/tickets/mine');
    const data = await response.json();

    if (response.ok && data.tickets && data.tickets.length > 0) {
      document.getElementById('ticketsList').innerHTML = createTicketsTable(data.tickets);
    } else {
      document.getElementById('ticketsList').innerHTML = '<p>No tickets purchased yet</p>';
    }
  } catch (error) {
    console.error('Error loading tickets:', error);
    document.getElementById('ticketsList').innerHTML = '<p>Error loading tickets</p>';
  }
}

// Show buy ticket modal
async function showBuyTicketModal(eventId) {
  try {
    const response = await fetchWithAuth(`/attendees/events/${eventId}`);
    const data = await response.json();

    if (response.ok) {
      const modal = document.getElementById('buyTicketModal');
      const eventDetails = document.getElementById('eventDetails');
      const availableTickets = document.getElementById('availableTickets');

      eventDetails.innerHTML = `
        <div class="event-info">
          <h4>${data.event.name}</h4>
          <p><strong>Genre:</strong> ${data.event.genre}</p>
          <p><strong>Price ($):</strong> $${data.event.price}</p>
          <p><strong>Description:</strong> ${data.event.description}</p>
          <p><strong>Organizer:</strong> ${data.event.organizerId.name}</p>
        </div>
      `;

      if (data.availableTickets && data.availableTickets.length > 0) {
        availableTickets.innerHTML = `
          <h5>Available Tickets:</h5>
          <div class="tickets-list">
            ${data.availableTickets.map(ticket => `
              <div class="ticket-option">
                <span>${ticket.ticketType}</span>
                <button class="btn-primary btn-sm" onclick="buyTicket('${ticket._id}')">Buy Ticket</button>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        availableTickets.innerHTML = '<p>No tickets available for this event</p>';
      }

      modal.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading event details:', error);
    alert('Error loading event details');
  }
}

// Buy ticket
async function buyTicket(eventId) {
  try {
    const response = await fetchWithAuth(`/attendees/tickets/buy/${eventId}`, {
      method: 'POST'
    });

    const data = await response.json();

    if (response.ok) {
      closeModal('buyTicketModal');
      
      // Show success message with timeout
      const successDiv = document.createElement('div');
      successDiv.className = 'success-message';
      successDiv.textContent = 'Ticket purchased successfully! 🎉';
      successDiv.style.display = 'block';
      successDiv.style.position = 'fixed';
      successDiv.style.top = '20px';
      successDiv.style.right = '20px';
      successDiv.style.zIndex = '9999';
      successDiv.style.backgroundColor = '#10b981';
      successDiv.style.color = 'white';
      successDiv.style.padding = '15px 20px';
      successDiv.style.borderRadius = '10px';
      successDiv.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
      
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
      
      // Refresh data
      loadAttendeeDashboardData();
      loadMyTickets();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error buying ticket:', error);
    alert('Network error. Please try again.');
  }
}

// =====================================
// ORGANIZER DASHBOARD FUNCTIONS
// =====================================

// Load organizer dashboard data
async function loadOrganizerDashboardData() {
  try {
    // Load my events count
    const eventsResponse = await fetchWithAuth('/organizers/events');
    const eventsData = await eventsResponse.json();
    
    if (document.getElementById('totalEvents')) {
      document.getElementById('totalEvents').textContent = eventsData.total || 0;
    }

    // Load recent events
    if (eventsData.events && eventsData.events.length > 0) {
      const recentEvents = eventsData.events.slice(0, 5);
      if (document.getElementById('recentEvents')) {
        document.getElementById('recentEvents').innerHTML = createOrganizerEventsTable(recentEvents);
      }
    } else {
      if (document.getElementById('recentEvents')) {
        document.getElementById('recentEvents').innerHTML = '<p>No events created yet</p>';
      }
    }
  } catch (error) {
    console.error('Error loading organizer dashboard data:', error);
  }
}

// Load my events (organizer)
async function loadMyEvents() {
  try {
    const response = await fetchWithAuth('/organizers/events');
    const data = await response.json();

    if (response.ok && data.events && data.events.length > 0) {
      document.getElementById('eventsList').innerHTML = createOrganizerEventsTable(data.events);
    } else {
      document.getElementById('eventsList').innerHTML = '<p>No events created yet</p>';
    }
  } catch (error) {
    console.error('Error loading events:', error);
    document.getElementById('eventsList').innerHTML = '<p>Error loading events</p>';
  }
}

// Create event
async function handleCreateEvent(e) {
  e.preventDefault();

  try {
    const formData = new FormData(e.target);
    const eventData = Object.fromEntries(formData);

    const response = await fetchWithAuth('/organizers/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });

    const data = await response.json();

    if (response.ok) {
      closeModal('createEventModal');
      loadMyEvents();
      loadOrganizerDashboardData();
      e.target.reset();
      alert('Event created successfully!');
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error creating event:', error);
    alert('Network error. Please try again.');
  }
}

// Delete event (organizer)
async function deleteEvent(eventId, eventName) {
  if (confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) {
    try {
      const response = await fetchWithAuth(`/organizers/events/${eventId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        loadMyEvents();
        loadOrganizerDashboardData();
        alert('Event deleted successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Network error. Please try again.');
    }
  }
}

// Show create ticket modal
function showCreateTicketModal(eventId, eventName) {
  const modal = document.getElementById('createTicketModal');
  document.getElementById('ticketEventId').value = eventId;
  document.getElementById('ticketEventName').textContent = eventName;
  modal.style.display = 'block';
}

// Create ticket
async function handleCreateTicket(e) {
  e.preventDefault();

  try {
    const formData = new FormData(e.target);
    const ticketData = Object.fromEntries(formData);
    const eventId = document.getElementById('ticketEventId').value;

    const response = await fetchWithAuth(`/organizers/tickets/${eventId}`, {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });

    const data = await response.json();

    if (response.ok) {
      closeModal('createTicketModal');
      e.target.reset();
      alert('Ticket created successfully!');
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    alert('Network error. Please try again.');
  }
}

// =====================================
// ADMIN DASHBOARD FUNCTIONS
// =====================================

// Load admin dashboard data
async function loadAdminDashboardData() {
  try {
    const response = await fetchWithAuth('/admin/dashboard/stats');
    const data = await response.json();

    if (response.ok) {
      if (document.getElementById('totalEvents')) {
        document.getElementById('totalEvents').textContent = data.totalEvents || 0;
      }
      if (document.getElementById('totalAttendees')) {
        document.getElementById('totalAttendees').textContent = data.totalAttendees || 0;
      }
      if (document.getElementById('totalOrganizers')) {
        document.getElementById('totalOrganizers').textContent = data.totalOrganizers || 0;
      }
      if (document.getElementById('totalTickets')) {
        document.getElementById('totalTickets').textContent = data.totalTickets || 0;
      }

      // Load recent events
      if (data.recentEvents && data.recentEvents.length > 0) {
        if (document.getElementById('recentEvents')) {
          document.getElementById('recentEvents').innerHTML = createAdminEventsTable(data.recentEvents);
        }
      } else {
        if (document.getElementById('recentEvents')) {
          document.getElementById('recentEvents').innerHTML = '<p>No events found</p>';
        }
      }
    }
  } catch (error) {
    console.error('Error loading admin dashboard data:', error);
  }
}

// Load all users (admin)
async function loadAllUsers() {
  try {
    const response = await fetchWithAuth('/admin/users');
    const data = await response.json();

    if (response.ok && data.users && data.users.length > 0) {
      document.getElementById('usersList').innerHTML = createUsersTable(data.users);
    } else {
      document.getElementById('usersList').innerHTML = '<p>No users found</p>';
    }
  } catch (error) {
    console.error('Error loading users:', error);
    document.getElementById('usersList').innerHTML = '<p>Error loading users</p>';
  }
}

// Load all events (admin)
async function loadAllEvents() {
  try {
    const response = await fetchWithAuth('/admin/events');
    const data = await response.json();

    if (response.ok && data.events && data.events.length > 0) {
      document.getElementById('eventsList').innerHTML = createAdminEventsTable(data.events);
    } else {
      document.getElementById('eventsList').innerHTML = '<p>No events found</p>';
    }
  } catch (error) {
    console.error('Error loading events:', error);
    document.getElementById('eventsList').innerHTML = '<p>Error loading events</p>';
  }
}

// Load all tickets (admin)
async function loadAllTickets() {
  try {
    const response = await fetchWithAuth('/admin/tickets');
    const data = await response.json();

    if (response.ok && data.tickets && data.tickets.length > 0) {
      document.getElementById('ticketsList').innerHTML = createAdminTicketsTable(data.tickets);
    } else {
      document.getElementById('ticketsList').innerHTML = '<p>No tickets found</p>';
    }
  } catch (error) {
    console.error('Error loading tickets:', error);
    document.getElementById('ticketsList').innerHTML = '<p>Error loading tickets</p>';
  }
}

// Delete ticket (admin)
async function deleteTicketAdmin(ticketId, ticketType, eventName) {
  if (confirm(`Are you sure you want to delete ticket "${ticketType}" for event "${eventName}"? This action cannot be undone.`)) {
    try {
      const response = await fetchWithAuth(`/admin/tickets/${ticketId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        loadAllTickets();
        loadAdminDashboardData();
        alert('Ticket deleted successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Network error. Please try again.');
    }
  }
}

// Delete user (admin)
async function deleteUser(userId, userName, userRole) {
  if (confirm(`Are you sure you want to delete ${userRole} "${userName}"? This action cannot be undone.`)) {
    try {
      let endpoint = '';
      if (userRole === 'attendee') {
        endpoint = `/admin/attendees/${userId}`;
      } else if (userRole === 'organizer') {
        endpoint = `/admin/organizers/${userId}`;
      } else if (userRole === 'admin') {
        endpoint = `/admin/admins/${userId}`;
      }

      const response = await fetchWithAuth(endpoint, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        loadAllUsers();
        loadAdminDashboardData();
        alert(`${userRole.charAt(0).toUpperCase() + userRole.slice(1)} deleted successfully!`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Network error. Please try again.');
    }
  }
}

// Delete event (admin)
async function deleteEventAdmin(eventId, eventName) {
  if (confirm(`Are you sure you want to delete event "${eventName}"? This action cannot be undone.`)) {
    try {
      const response = await fetchWithAuth(`/admin/events/${eventId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        loadAllEvents();
        loadAdminDashboardData();
        alert('Event deleted successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Network error. Please try again.');
    }
  }
}

// =====================================
// TABLE CREATION FUNCTIONS
// =====================================

// Create events table for attendees
function createEventsTable(events, showBuyButton = false) {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Event Name</th>
          <th>Genre</th>
          <th>Category</th>
          <th>Price ($)</th>
          <th>Organizer</th>
          <th>Description</th>
          ${showBuyButton ? '<th>Actions</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${events.map(event => `
          <tr>
            <td>${event.name}</td>
            <td><span class="genre-badge">${event.genre}</span></td>
            <td><span class="category-badge">${event.category || 'N/A'}</span></td>
            <td>${event.price}</td>
            <td>${event.organizerId ? event.organizerId.name : 'Unknown'}</td>
            <td class="description">${event.description}</td>
            ${showBuyButton ? `
              <td>
                <button class="btn-sm btn-primary" onclick="showBuyTicketModal('${event._id}')">Buy Ticket</button>
              </td>
            ` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Create organizer events table
function createOrganizerEventsTable(events) {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Event Name</th>
          <th>Genre</th>
          <th>Price ($)</th>
          <th>Description</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${events.map(event => `
          <tr>
            <td>${event.name}</td>
            <td><span class="genre-badge">${event.genre}</span></td>
            <td>${event.price}</td>
            <td class="description">${event.description}</td>
            <td>${new Date(event.createdAt).toLocaleDateString()}</td>
            <td>
              <div class="action-btns">
                <button class="btn-sm btn-edit" onclick="showCreateTicketModal('${event._id}', '${event.name}')">Add Ticket</button>
                <button class="btn-sm btn-delete" onclick="deleteEvent('${event._id}', '${event.name}')">Delete</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Create admin events table
function createAdminEventsTable(events) {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Event Name</th>
          <th>Genre</th>
          <th>Price ($)</th>
          <th>Organizer</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${events.map(event => `
          <tr>
            <td>${event.name}</td>
            <td><span class="genre-badge">${event.genre}</span></td>
            <td>${event.price}</td>
            <td>${event.organizerId ? event.organizerId.name : 'Unknown'}</td>
            <td>${new Date(event.createdAt).toLocaleDateString()}</td>
            <td>
              <div class="action-btns">
                <button class="btn-sm btn-delete" onclick="deleteEventAdmin('${event._id}', '${event.name}')">Delete</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Create tickets table
function createTicketsTable(tickets) {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Ticket Type</th>
          <th>Event Name</th>
          <th>Organizer</th>
          
          <th>Genre</th>
          <th>Price ($)</th>
          
          <th>QR Code</th>
        </tr>
      </thead>
      <tbody>
        ${tickets.map(ticket => `
          <tr>
            <td><span class="ticket-badge">${ticket.ticketType}</span></td>
            <td>${ticket.eventId.name}</td>
            <td>${ticket.eventId.organizerId?.name || 'N/A'}</td>
            
            <td><span class="genre-badge">${ticket.eventId.genre}</span></td>
            <td>${ticket.eventId.price}</td>
            <td>
              ${ticket.qrCode ? `<img src="${ticket.qrCode}" alt="QR Code" class="qr-code-image" />` : 'N/A'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Create admin tickets table
function createAdminTicketsTable(tickets) {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Ticket Type</th>
          <th>Event Name</th>
          <th>Organizer</th>
          <th>Genre</th>
          <th>Price ($)</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${tickets.map(ticket => `
          <tr>
            <td><span class="ticket-badge">${ticket.ticketType}</span></td>
            <td>${ticket.eventId.name}</td>
            <td>${ticket.eventId.organizerId?.name || 'N/A'}</td>
            <td><span class="genre-badge">${ticket.eventId.genre}</span></td>
            <td>${ticket.eventId.price}</td>
            <td>${new Date(ticket.createdAt).toLocaleDateString()}</td>
            <td>
              <div class="action-btns">
                <button class="btn-sm btn-delete" onclick="deleteTicketAdmin('${ticket._id}', '${ticket.ticketType}', '${ticket.eventId.name}')">Delete</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Create users table
function createUsersTable(users) {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role.toUpperCase()}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
              <div class="action-btns">
                <button class="btn-sm btn-delete" onclick="deleteUser('${user._id}', '${user.name}', '${user.role}')">Delete</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// =====================================
// MODAL FUNCTIONS
// =====================================

// Show modals
function showCreateEventModal() {
  document.getElementById('createEventModal').style.display = 'block';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Close modal with escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
  }
});