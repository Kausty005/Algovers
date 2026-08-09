"""
pytest configuration — adds the backend directory to sys.path so that
`from app.xxx import yyy` works without installing the package.
"""
import sys
import os

# Insert backend/ into path so `app` is importable
sys.path.insert(0, os.path.dirname(__file__))
