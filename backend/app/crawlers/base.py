import httpx
from abc import ABC, abstractmethod


class BaseCrawler(ABC):
    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    }
    TIMEOUT = 20.0

    async def get_html(self, url: str, params: dict = None) -> str:
        async with httpx.AsyncClient(
            headers=self.HEADERS,
            timeout=self.TIMEOUT,
            follow_redirects=True,
        ) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            return r.text

    async def get_json(self, url: str, params: dict = None, extra_headers: dict = None) -> dict | list:
        headers = {**self.HEADERS, **(extra_headers or {})}
        async with httpx.AsyncClient(
            headers=headers,
            timeout=self.TIMEOUT,
            follow_redirects=True,
        ) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            return r.json()

    @abstractmethod
    async def crawl(self) -> list[dict]:
        pass
