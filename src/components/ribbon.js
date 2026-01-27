// Ribbon 回调函数

function GetUrlPath() {
    if (window.location.protocol === 'file:') {
        const path = window.location.href;
        return path.substring(0, path.lastIndexOf('/'));
    }
    const { protocol, hostname, port } = window.location;
    const portPart = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portPart}`;
}

function GetRouterHash() {
    if (window.location.protocol === 'file:') {
        return '';
    }
    return '/#';
}

// 关闭所有任务面板
function closeAllTaskPanes() {
    const tsId = window.Application.PluginStorage.getItem('agent_pane_id');
    if (tsId) {
        try {
            const taskPane = window.Application.GetTaskPane(tsId);
            if (taskPane && taskPane.Visible) {
                taskPane.Visible = false;
            }
        } catch (error) {
            console.error('关闭面板失败:', error);
        }
    }
}

const xmlNavbarButtons = {
    openAgent: {
        id: 'openAgent',
        label: 'AI Agent',
        image: 'images/agent.svg',
        onAction: () => {
            const tsId = window.Application.PluginStorage.getItem('agent_pane_id');
            if (!tsId) {
                const taskPane = window.Application.CreateTaskPane(GetUrlPath() + GetRouterHash() + '/agent');
                window.Application.PluginStorage.setItem('agent_pane_id', taskPane.ID);
                taskPane.Visible = true;
                taskPane.DockPosition = 2; // 右侧
                taskPane.Width = 400;
            } else {
                const taskPane = window.Application.GetTaskPane(tsId);
                taskPane.Visible = !taskPane.Visible;
            }
        }
    }
};

const xmlNavbarButtonsArr = Object.keys(xmlNavbarButtons).map(key => xmlNavbarButtons[key]);

function getConfig(control) {
    return xmlNavbarButtonsArr.find(c => c.id === control.Id);
}

export default {
    OnAddinLoad(ribbonUI) {
        if (typeof window.Application.ribbonUI != 'object') {
            window.Application.ribbonUI = ribbonUI;
        }
        window.Application = window.Application;
        return true;
    },
    OnAction(control) {
        xmlNavbarButtons[control.Id]?.onAction(control);
    },
    GetImage(control) {
        const config = getConfig(control);
        return config?.image;
    },
    OnGetEnabled(control) {
        return true;
    },
    OnGetVisible(control) {
        return true;
    },
    OnGetLabel(control) {
        const config = getConfig(control);
        return config?.label;
    }
};
