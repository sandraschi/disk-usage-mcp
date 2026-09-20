"""Runtime hook for PyInstaller — ensures opentelemetry API can find its implementation."""

import os
import sys

_otel_path = os.path.join(sys._MEIPASS, "opentelemetry")
if os.path.isdir(_otel_path):
    sys.path.insert(0, _otel_path)
