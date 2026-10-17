-- Ressource FiveM : envoie les événements du groupe vers le dashboard.
-- À adapter à ton framework custom : appelle les exports ci-dessous
-- depuis tes scripts de coffre / argent / membres.

local URL    = GetConvar('dashboard_url', 'http://127.0.0.1:3000/api/webhook')
local SECRET = GetConvar('dashboard_secret', 'change-moi-avec-une-longue-chaine-aleatoire')
local GROUP  = GetConvar('dashboard_group', 'default')

local queue = {}

local function push(evt)
    evt.group = evt.group or GROUP
    evt.ts = evt.ts or os.time()
    queue[#queue + 1] = evt
end

-- Envoi groupé toutes les 2 secondes pour ne pas spammer le site
CreateThread(function()
    while true do
        Wait(2000)
        if #queue > 0 then
            local batch = queue
            queue = {}
            PerformHttpRequest(URL, function(status)
                if status ~= 200 then
                    print(('[dashboard_logs] erreur HTTP %s'):format(tostring(status)))
                end
            end, 'POST', json.encode(batch), {
                ['Content-Type'] = 'application/json',
                ['x-webhook-secret'] = SECRET,
            })
        end
    end
end)

-- ===== Exports à appeler depuis tes autres scripts =====

-- Log générique : action = 'deposit' | 'withdraw' | 'kill' | 'death' | 'join' | 'leave' | 'info'
-- Pour deposit/withdraw avec item+count, le stock du coffre est mis à jour automatiquement.
exports('Log', function(player, action, message, item, count, label, identifier)
    push({
        type = 'log', player = player, action = action, message = message,
        item = item, count = count, label = label, identifier = identifier,
    })
end)

-- Snapshot complet du coffre : items = { { name='weapon_pistol', label='Pistolet', count=3, category='armes', image=nil }, ... }
exports('SyncStock', function(items)
    push({ type = 'stock', items = items })
end)

-- Argent du groupe
exports('SyncMoney', function(clean, dirty)
    push({ type = 'money', clean = clean, dirty = dirty })
end)

-- Membres : members = { { identifier='license:xxx', name='John Doe', grade='Boss', online=true }, ... }
exports('SyncMembers', function(members)
    push({ type = 'members', members = members })
end)

-- ===== Exemple d'utilisation (à supprimer) =====
-- RegisterCommand('testdash', function(src)
--     exports.dashboard_logs:Log(GetPlayerName(src), 'deposit', 'Dépôt au coffre', 'weapon_pistol', 1, 'Pistolet')
--     exports.dashboard_logs:SyncMoney(25000, 120000)
-- end, true)
