// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDXMLuoViRn5afKpQcPX0D4hQEzFjDATUs",
    authDomain: "gyanbuddy-ae92b.firebaseapp.com",
    projectId: "gyanbuddy-ae92b",
    storageBucket: "gyanbuddy-ae92b.appspot.com",
    messagingSenderId: "574675903576",
    appId: "1:574675903576:web:c6bc90a4fce5340641562d",
    measurementId: "G-ED71GEWKRD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("loginBox").style.display = 'none';
        document.getElementById("adminDashboard").style.display = 'block';
        document.getElementById("sidebarToggle").style.display = 'block';
        fetchDashboardData();
        startDashboardRefresh();
    } else {
        document.getElementById("loginBox").style.display = 'block';
        document.getElementById("adminDashboard").style.display = 'none';
        document.getElementById("sidebarToggle").style.display = 'none';
    }
});

// Function to fetch all user data
async function fetchAllUserData() {
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    let userData = [];
    let totalUsers = 0;
    let activeUsers = 0;
    let totalUsageTime = 0;
    let totalSessions = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const doc of userSnapshot.docs) {
        const user = doc.data();
        totalUsers++;
        
          // Use lastActiveDate instead of lastLoginDate
          if (user.lastActiveDate && user.lastActiveDate.toDate() > sevenDaysAgo) {
            activeUsers++;
        }
        totalUsageTime += user.totalUsageTime || 0;
        totalSessions += user.sessionCount || 0;  // Changed from totalSessions to sessionCount

        
        userData.push({
            id: doc.id,
            email: user.email,
            name: user.name,
            profileImageUrl: user.profileImageUrl,
            registrationDate: user.registrationDate,
            lastActiveDate: user.lastActiveDate,
            sessionCount: user.sessionCount || 0,
            totalCorrectAnswers: user.totalCorrectAnswers || 0,
            totalQuizQuestions: user.totalQuizQuestions || 0,
            totalQuizzesTaken: user.totalQuizzesTaken || 0,
            totalUsageTime: user.totalUsageTime || 0,
            completedModules: user.completedModules || [],
            // Add other fields as needed
        });
    }

    return {
        userData,
        totalUsers,
        activeUsers,
        totalUsageTime,
        totalSessions,
    };
}

// Function to update admin dashboard user stats
async function updateAdminDashboardUserStats() {
    const { totalUsers, activeUsers, totalUsageTime, totalSessions } = await fetchAllUserData();
    const userStatsTable = document.getElementById("user-stats-table");
    if (userStatsTable) {
        const averageUsageTime = totalUsers > 0 ? Math.floor(totalUsageTime / totalUsers / 60) : 0;
        userStatsTable.innerHTML = `
            <tr><td>Total Users</td><td>${totalUsers}</td></tr>
            <tr><td>Active Users (Last 7 Days)</td><td>${activeUsers}</td></tr>
            <tr><td>Average Usage Time</td><td>${averageUsageTime} minutes</td></tr>
            <tr><td>Total Sessions</td><td>${totalSessions}</td></tr>
        `;
    }
}

// Function to update user admin table
async function updateUserAdminTable() {
    const { userData } = await fetchAllUserData();
    const userTable = document.getElementById("userTable");
    if (userTable) {
        userTable.innerHTML = ''; // Clear previous data
        userData.forEach((user) => {
            const row = `<tr>
                <td>${user.name || user.displayName || 'N/A'}</td>
                <td>${user.email}</td>
                <td>${user.registrationDate ? new Date(user.registrationDate.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                <td>${user.totalQuizzesTaken || 0}</td>
                <td>${user.totalUsageTime ? Math.floor(user.totalUsageTime / 60) : 0} minutes</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">Delete</button>
                </td>
            </tr>`;
            userTable.innerHTML += row;
        });
        addUserManagementListeners();
    }
}

// Function to fetch dashboard data
function fetchDashboardData() {
    updateAdminDashboardUserStats();
    updateAdminDashboardQuizStats();
}

async function fetchAllQuizData() {
    const { userData } = await fetchAllUserData();
    let totalQuizzesTaken = 0;
    let totalCorrectAnswers = 0;
    let totalQuizQuestions = 0;
    let totalModulesCompleted = 0;
    let totalUsageTime = 0;

    for (const user of userData) {
        totalQuizzesTaken += user.totalQuizzesTaken || 0;
        totalCorrectAnswers += user.totalCorrectAnswers || 0;
        totalQuizQuestions += user.totalQuizQuestions || 0;
        totalUsageTime += user.totalUsageTime || 0;

        // Fetch completed modules for each user
        const completedModulesRef = collection(db, 'users', user.id, 'completedModules');
        const completedModulesSnapshot = await getDocs(completedModulesRef);
        totalModulesCompleted += completedModulesSnapshot.size;
    }

    return {
        totalModulesCompleted,
        totalQuizzesTaken,
        totalCorrectAnswers,
        totalQuizQuestions,
        totalUsageTime
    };
}

async function updateAdminDashboardQuizStats() {
    const quizData = await fetchAllQuizData();
    const quizStatsTable = document.getElementById("quiz-stats-table-ad");
    if (quizStatsTable) {
        const averageScore = quizData.totalQuizQuestions > 0 ? 
            ((quizData.totalCorrectAnswers / quizData.totalQuizQuestions) * 100).toFixed(2) + '%' : 'N/A';
        const averageUsageTime = quizData.totalQuizzesTaken > 0 ? 
            Math.floor((quizData.totalUsageTime / quizData.totalQuizzesTaken) / 60) : 0;
        
        quizStatsTable.innerHTML = `
            <tr><td>Total Modules Completed</td><td>${quizData.totalModulesCompleted}</td></tr>
            <tr><td>Total Quizzes Taken</td><td>${quizData.totalQuizzesTaken}</td></tr>
            <tr><td>Average Score</td><td>${averageScore}</td></tr>
            <tr><td>Average Usage Time</td><td>${averageUsageTime} minutes</td></tr>
        `;
    }
}

async function updateQuizStatsPage() {
    const quizData = await fetchAllQuizData();
    const quizStatsTable = document.getElementById("quiz-stats-table");
    if (quizStatsTable) {
        const averageScore = quizData.totalQuizQuestions > 0 ? 
            ((quizData.totalCorrectAnswers / quizData.totalQuizQuestions) * 100).toFixed(2) + '%' : 'N/A';
        const averageUsageTime = quizData.totalQuizzesTaken > 0 ? 
            Math.floor((quizData.totalUsageTime / quizData.totalQuizzesTaken) / 60) : 0;
        
        quizStatsTable.innerHTML = `
            <tr><td>Total Questions Asked</td><td>${quizData.totalQuizQuestions}</td></tr>
            <tr><td>Total Correct Answers</td><td>${quizData.totalCorrectAnswers}</td></tr>
            <tr><td>Total Score</td><td>${quizData.totalCorrectAnswers}</td></tr>
            <tr><td>Total Modules Completed</td><td>${quizData.totalModulesCompleted}</td></tr>
            <tr><td>Total Quizzes Taken</td><td>${quizData.totalQuizzesTaken}</td></tr>
            <tr><td>Average Score</td><td>${averageScore}</td></tr>
            <tr><td>Average Usage Time</td><td>${averageUsageTime} minutes</td></tr>
        `;
    }
}


function startDashboardRefresh() {
    setInterval(fetchDashboardData, 60000); // Refresh every 60 seconds
}

// Function to add event listeners for user management
function addUserManagementListeners() {
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', (e) => editUser(e.target.dataset.id));
    });
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', (e) => deleteUser(e.target.dataset.id));
    });
}

// Function to edit a user
async function editUser(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const user = userDoc.data();
    
    // Create and show a modal for editing user details
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal fade" id="editUserModal" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editUserModalLabel">Edit User: ${user.name || user.email}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm">
                            <div class="mb-3">
                                <label for="editName" class="form-label">Name</label>
                                <input type="text" class="form-control" id="editName" value="${user.name || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="editEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="editEmail" value="${user.email}" readonly>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="saveUserChanges">Save changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    editUserModal.show();

    document.getElementById('saveUserChanges').addEventListener('click', async () => {
        const updatedName = document.getElementById('editName').value;
        try {
            await updateDoc(doc(db, 'users', userId), {
                name: updatedName
            });
            editUserModal.hide();
            updateUserAdminTable(); // Refresh the user list
        } catch (error) {
            console.error("Error updating user:", error);
            alert('Failed to update user. Please try again.');
        }
    });
}

// Function to delete a user
async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await deleteDoc(doc(db, 'users', userId));
            updateUserAdminTable(); // Refresh the user list
        } catch (error) {
            console.error("Error deleting user:", error);
            alert('Failed to delete user. Please try again.');
        }
    }
}

// Handle admin login
const adminLoginForm = document.getElementById('adminLoginForm');
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        const adminEmail = "admin@gb.com";

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                if (userCredential.user.email === adminEmail) {
                    console.log("Admin logged in successfully");
                    updateLastLoginDate(userCredential.user.uid);
                    document.getElementById("loginBox").style.display = 'none';
                    document.getElementById("adminDashboard").style.display = 'block';
                    document.getElementById("sidebarToggle").style.display = 'block';
                    fetchDashboardData();
                } else {
                    console.error("User is not an admin");
                    signOut(auth);
                    alert("You do not have admin privileges.");
                }
            })
            .catch((error) => {
                console.error("Login error:", error);
                alert("Login failed. Please check your credentials.");
            });
    });
}

// Function to update last login date
async function updateLastLoginDate(userId) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        lastLoginDate: serverTimestamp()
    });
}

// Logout functionality
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "admin.html"; // Redirect to login page
        }).catch((error) => {
            console.error("Error logging out:", error);
        });
    });
}

// Sidebar toggle functionality
const sidebarToggle = document.getElementById("sidebarToggle");
if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
        const sidebar = new bootstrap.Offcanvas(document.getElementById('adminSidebar'));
        sidebar.show();
    });
}
// Initialize sidebar on page load
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = new bootstrap.Offcanvas(document.getElementById('adminSidebar'));
});

// Initialize admin functionalities
window.addEventListener('load', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchDashboardData();
            setupAdminNavigation();
        } else {
            console.log("User not logged in");
        }
    });
});

// Setup admin navigation
function setupAdminNavigation() {
    const navItems = document.querySelectorAll('.nav-link');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.getAttribute('href') !== '#') {
                return; // Allow default behavior for external links
            }
            e.preventDefault();
            const target = e.target.getAttribute('data-target');
            showSection(target);
        });
    });
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }

    switch(sectionId) {
        case 'userManagement':
            updateUserAdminTable();
            break;
        case 'quizStatistics':
            // fetchQuizStatistics();
            updateQuizStatsPage();
            break;
    }
}

// Export functions for use in other modules if needed
export {
    fetchDashboardData,
    updateUserAdminTable,
    // fetchQuizStatistics,
    updateQuizStatsPage,
    updateAdminDashboardQuizStats,
    editUser,
    deleteUser,
    fetchAllQuizData
};
