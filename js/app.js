class PlanerApp {
    constructor() {
        this.taskForm = document.getElementById('taskForm');
        this.taskInput = document.getElementById('taskInput');
        this.tasksList = document.getElementById('tasksList');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.totalTasksCount = document.getElementById('totalTasksCount');
        this.completedTasksCount = document.getElementById('completedTasksCount');
        this.pendingTasksCount = document.getElementById('pendingTasksCount');

        this.tasksArray = [];
        this.storageKey = 'planerTasks';

        this.initializeApp();
        this.attachEventListeners();
    }

    initializeApp() {
        this.loadTasksFromStorage();
        this.renderTasks();
        this.updateStatistics();
    }

    loadTasksFromStorage() {
        try {
            const savedTasks = localStorage.getItem(this.storageKey);
            this.tasksArray = savedTasks ? JSON.parse(savedTasks) : [];
        } catch (error) {
            console.error('Ошибка при загрузке задач:', error);
            this.tasksArray = [];
        }
    }

    saveTasksToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.tasksArray));
        } catch (error) {
            console.error('Ошибка при сохранении задач:', error);
        }
    }

    attachEventListeners() {
        this.taskForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.addNewTask();
        });

        this.clearAllBtn.addEventListener('click', () => {
            this.clearAllTasks();
        });

        this.tasksList.addEventListener('change', (event) => {
            if (event.target.classList.contains('task-checkbox')) {
                const taskId = parseInt(event.target.dataset.taskId);
                this.toggleTaskCompletion(taskId);
            }
        });

        this.tasksList.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-delete')) {
                const taskId = parseInt(event.target.dataset.taskId);
                this.deleteTask(taskId);
            }
        });
    }

    // ===== ОПТИМИСТИЧНОЕ ДОБАВЛЕНИЕ ЗАДАЧИ =====
    addNewTask() {
        const taskText = this.taskInput.value.trim();

        if (!taskText) {
            this.showNotification('Пожалуйста, введите текст задачи');
            this.taskInput.focus();
            return;
        }

        if (taskText.length > 500) {
            this.showNotification('Максимум 500 символов');
            return;
        }

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdDate: new Date().toLocaleDateString('ru-RU')
        };

        // 1. Мгновенно обновляем UI и localStorage
        this.tasksArray.push(newTask);
        this.saveTasksToStorage();
        this.taskInput.value = '';
        this.taskInput.focus();
        this.renderTasks();
        this.updateStatistics();
        this.showNotification('Задача добавлена');

        // 2. Фоном отправляем запрос (не блокирует UI)
        this.sendTaskToServer(newTask);
    }

    // Упрощённый метод — только запрос + уведомления
    sendTaskToServer(taskData) {
        fetch('https://jsonplaceholder.typicode.com/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ошибка сервера: ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                // Можно опционально показать «синхронизировано с сервером»
                // this.showNotification('Задача синхронизирована с сервером');
            })
            .catch(error => {
                console.error('Ошибка при отправке задачи:', error);
                // Тут можно показать мягкое предупреждение
                // this.showNotification('Сервер недоступен, задача сохранена локально');
            });
    }

    toggleTaskCompletion(taskId) {
        const task = this.tasksArray.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasksToStorage();
            this.renderTasks();
            this.updateStatistics();
            const message = task.completed ? 'Задача выполнена' : 'Задача возобновлена';
            this.showNotification(message);
        }
    }

    deleteTask(taskId) {
        this.tasksArray = this.tasksArray.filter(t => t.id !== taskId);
        this.saveTasksToStorage();
        this.renderTasks();
        this.updateStatistics();
        this.showNotification('Задача удалена');
    }

    clearAllTasks() {
        if (this.tasksArray.length === 0) {
            this.showNotification('Нет задач для удаления');
            return;
        }

        if (confirm('Вы уверены? Все задачи будут удалены безвозвратно.')) {
            this.tasksArray = [];
            this.saveTasksToStorage();
            this.renderTasks();
            this.updateStatistics();
            this.showNotification('Все задачи удалены');
        }
    }

    renderTasks() {
        this.tasksList.innerHTML = '';

        if (this.tasksArray.length === 0) {
            this.tasksList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">—</div>
                    <div class="empty-state-text">Нет задач. Добавьте первую.</div>
                </div>
            `;
            return;
        }

        this.tasksArray.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;

            taskElement.innerHTML = `
                <input type="checkbox" class="task-checkbox"
                    ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <span class="task-date">${task.createdDate}</span>
                <div class="task-actions">
                    <button class="btn btn-delete" data-task-id="${task.id}">Удалить</button>
                </div>
            `;

            this.tasksList.appendChild(taskElement);
        });
    }

    updateStatistics() {
        const totalTasks = this.tasksArray.length;
        const completedTasks = this.tasksArray.filter(t => t.completed).length;
        const pendingTasks = totalTasks - completedTasks;

        this.totalTasksCount.textContent = totalTasks;
        this.completedTasksCount.textContent = completedTasks;
        this.pendingTasksCount.textContent = pendingTasks;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PlanerApp();
});
