<?php
declare(strict_types=1);

namespace App;

/**
 * Exceção HTTP usada pelos controllers.
 *
 * O Router captura essas exceções e responde JSON com o status apropriado.
 */
class HttpException extends \RuntimeException
{
    /**
     * @param array<string, mixed> $details
     */
    public function __construct(
        public readonly int $statusCode,
        string $message,
        public readonly array $details = [],
    ) {
        parent::__construct($message);
    }
}
