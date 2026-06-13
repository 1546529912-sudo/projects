<?php
return [
    'commands' => [
        'consume:wms' => \app\command\ConsumeWmsEvents::class,
        'consume:wms-inventory' => \app\command\ConsumeWmsInventory::class,
        'consume:webhook' => \app\command\ConsumeWebhook::class,
        'refund:close-overdue' => \app\command\CloseOvertimeRefunds::class,
        'dead-letter:auto-replay' => \app\command\DeadLetterAutoReplay::class,
    ],
];
