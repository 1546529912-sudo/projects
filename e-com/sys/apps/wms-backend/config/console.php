<?php
return [
    'commands' => [
        'consume:oms' => \app\command\ConsumeOmsEvents::class,
        'consume:pim' => \app\command\ConsumePimEvents::class,
        'consume:oms-audit' => \app\command\ConsumeOmsAudit::class,
        'wms:stock-alert-notify' => \app\command\StockAlertNotify::class,
        'wms:stock-take-schedule' => \app\command\StockTakeSchedule::class,
    ],
];
