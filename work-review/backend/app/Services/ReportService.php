<?php

namespace App\Services;

use App\Models\DailyReport;

class ReportService
{
    public function generate(int $userId, string $date, array $records): array
    {
        // 组装符合 Report Schema 的日报结构
        $reportContent = [
            'date' => $date,
            'summary' => $this->buildSummary($records),
            'projects' => $records,
            'tomorrow_focus' => $this->extractTomorrowFocus($records),
        ];

        // 生成两种模板文本
        $personalText = $this->renderPersonalTemplate($reportContent);
        $formalText = $this->renderFormalTemplate($reportContent);

        return [
            'content' => $reportContent,
            'personal_text' => $personalText,
            'formal_text' => $formalText,
        ];
    }

    private function buildSummary(array $records): string
    {
        $projectNames = array_column($records, 'project_name');
        $count = count($records);
        return "今日涉及 {$count} 个项目：" . implode('、', $projectNames);
    }

    private function extractTomorrowFocus(array $records): array
    {
        $nextSteps = [];
        foreach ($records as $record) {
            if (!empty($record['next_steps'])) {
                array_push($nextSteps, ...$record['next_steps']);
            }
        }
        return array_slice($nextSteps, 0, 3); // 最多取 3 条
    }

    private function renderPersonalTemplate(array $content): string
    {
        $date = $content['date'];
        $lines = ["【{$date} 日报】", ""];

        foreach ($content['projects'] as $project) {
            $lines[] = "▌ {$project['project_name']}";
            foreach ($project['actions'] as $action) {
                $lines[] = "  • {$action}";
            }
            if (!empty($project['problems'])) {
                $lines[] = "  ⚠ 问题：" . implode('；', $project['problems']);
            }
            $lines[] = "";
        }

        if (!empty($content['tomorrow_focus'])) {
            $lines[] = "【明日计划】";
            foreach ($content['tomorrow_focus'] as $focus) {
                $lines[] = "  • {$focus}";
            }
        }

        return implode("\n", $lines);
    }

    private function renderFormalTemplate(array $content): string
    {
        $date = $content['date'];
        $lines = ["{$date} 工作汇报", ""];
        $lines[] = "一、今日工作完成情况";

        $i = 1;
        foreach ($content['projects'] as $project) {
            $lines[] = "{$i}. {$project['project_name']}";
            foreach ($project['actions'] as $action) {
                $lines[] = "   - {$action}";
            }
            $i++;
        }

        if (!empty($content['tomorrow_focus'])) {
            $lines[] = "";
            $lines[] = "二、明日工作计划";
            foreach ($content['tomorrow_focus'] as $idx => $focus) {
                $num = $idx + 1;
                $lines[] = "{$num}. {$focus}";
            }
        }

        return implode("\n", $lines);
    }
}
