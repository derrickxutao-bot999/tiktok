# Episode 2 · Sources and fact check

## Footage clearance list (cut 3)

Only three short real-footage segments remain. Everything else is illustrated. Each one plays on a TV inside the illustrated room and is cropped clear of broadcaster logos.

| Film time | Length | Content | Rights holder to license from |
|---|---|---|---|
| 0:00–0:12.5 | 12.5 s | Lisandro Martínez post-match interview, 13 Oct 2026 (three continuous passages) | Prime Video / UEFA |
| 0:57.5–1:00 | 2.5 s | Solskjær's winner, 1999 Champions League final | UEFA (archive) |
| 1:10–1:12.5 | 2.5 s | Sir Alex Ferguson's farewell speech, Old Trafford, 12 May 2013 | Premier League / Manchester United |

The working copies used in the edit came from public uploads: Prime Video Sport UK's post on X, and the Internet Archive for the other two. Before publishing, replace them with licensed masters of the same moments. The edit points are in `src/shots2.py` (`corner2`, `dorm`) and `src/edit2.py` (`CLIP_AUDIO`).

Not used: fan edits, news-programme copies, and any 2024 FA Cup final footage. That section stays illustrated.


Everything shown with a 史实 (documented) label, or stated in the narration with a date, is listed here.
The father, the boy who grows up, the roommates, the phone call and every scene inside a room are **fiction**.
The film says so on screen with a 虚构 label and again on the end card.

## Opening, loop and ending: Lisandro Martínez interview

The TV plays Prime Video Sport UK's post-match interview with Martínez, from their post of 13 Oct 2026 after Atlético Madrid 2-0 Manchester United (Champions League):
https://twitter.com/primevideosport/status/2110119478176411773/video/1

The opening is a tight edit of three continuous passages from the clip. Nothing is reordered or put together from separate sentences. Each Chinese subtitle translates exactly what is heard:

| Clip time | Heard | Subtitle |
|---|---|---|
| 0:06–0:09 | "Really poor. Really poor." | 真的很差。真的很差。 |
| 0:15–0:21 | "…sometimes it's a reflection of the mirror of how is our club at the moment." | 有时候，这就是俱乐部现状的一面镜子。 |
| 0:25–0:28 | "…now we expect more from the top, from up…" | 我们期待高层做得更多。 |

When the time loop closes (0:44–0:50), the same clip is heard again ("Really poor."). At the end (3:38) the TV plays a later passage from the same interview: "You can't stay with what you did last season. The teams know how you play…" It sits low under the narration, without subtitles.

Reports of the same interview:
- [Irish Times / PA, 14 Oct 2026](https://www.irishtimes.com/sport/soccer/2026/10/14/lisandro-martinez-says-manchester-united-lack-ambition-in-criticism-of-clubs-leadership/)
- [Yahoo Sports: "We expect more from the top"](https://sports.yahoo.com/articles/expect-more-top-lisandro-martinez-213516002.html)
- [Yahoo Sports / The Independent: Martínez's follow-up statement](https://sports.yahoo.com/articles/lisandro-martinez-issues-fresh-statement-231858252.html). He said he "spoke out of anger and frustration" and did not apologise.

**Rights:** the footage belongs to Prime Video / UEFA. It is used briefly, for commentary, and credited on screen. Whether it can be posted to TikTok is the publisher's call.

## 1999 Champions League final

- 26 May 1999, Camp Nou, Barcelona. Manchester United 2-1 Bayern Munich.
- Basler free kick in the 6th minute. Three minutes of added time were shown.
- Equaliser: Beckham corner, Giggs shot, Sheringham finishes (91st minute).
- Winner: another corner, Sheringham flick header, Solskjær finishes (93rd minute).
- The pitch diagrams are labelled 示意图 (schematic). They show the sequence of events, not exact player positions.
- Sources: [National Football Museum](https://nationalfootballmuseum.com/halloffame/teddy-sheringham/), [Planet Football: Sheringham on May 1999](https://www.planetfootball.com/in-depth/teddy-sheringham-talks-replacing-eric-cantona-at-man-utd-and-11-days-in-may-1999), [Sportskeeda](https://www.sportskeeda.com/football/champions-league-final-1999)
- Ferguson's "Football. Bloody hell." comes from his television interview right after the final. It is widely quoted, but I found no transcript online. The interviewer is commonly identified as ITV's Gary Newbon, whose memoir is titled [*Newbon, Bloody Hell*](https://www.bitebackpublishing.com/books/newbon-bloody-hell). The film attributes the line only to "a post-match television interview".

## The long wait

- Ferguson announced his retirement in May 2013 (8 May 2013).
- Trophies lit on the seasons timeline: 2015/16 FA Cup, 2016/17 League Cup and Europa League, 2022/23 League Cup, 2023/24 FA Cup.
- No trophy in 2024/25. In 2025/26 Manchester City won both domestic cups, Arsenal won the league and United finished third. Sources: [ESPN table](https://www.espn.com/Football/standings), [2026 FA Cup final](https://en.wikipedia.org/wiki/2026_FA_Cup_final).
- 2024 FA Cup final, 25 May 2024, Wembley: Man United 2-1 Man City. Garnacho 30', Mainoo 39', Doku 87'. Both United scorers were 19. Source: [manutd.com match report](https://www.manutd.com/en/news/detail/match-report-2024-emirates-fa-cup-final-man-city-v-man-utd-25-may).

## Green and gold

- In 2005 the Glazer family completed a leveraged takeover of the club, and the acquisition debt was placed on the club.
- Green and gold were the colours of Newton Heath (founded 1878), the club that became Manchester United. Fans adopted green-and-gold scarves as a protest, and the campaign grew around 2010. Sources: [Goal](https://www.goal.com/en-om/news/why-do-man-utd-fans-wear-yellow-green-scarves/1drqf8c840ht9138ysr00v4e00), [90min](https://www.90min.com/posts/why-man-utd-fans-wear-yellow-green-scarves).
- 2 May 2021: protests outside Old Trafford after the failed European Super League. Thousands gathered outside, some fans got into the stadium, and the match against Liverpool was postponed. It was the first Premier League match postponed because of a protest. Sources: [Wikipedia: 2021 Old Trafford protests](https://en.wikipedia.org/wiki/2021_Old_Trafford_protests), [CBS Sports](https://www.cbssports.com/soccer/news/manchester-united-liverpool-postponed-after-fans-invade-old-trafford-pitch-during-glazer-protest/).
- FC United of Manchester is deliberately not included.

## Fiction

- The protagonist is 7 in May 1999, at university in May 2013, and 34 in 2026. "二十七年" counts 1999 to 2026.
- The phone call ("爸，你看到了吗？" / "看到了。") and the father's "再等一会儿" are invented lines.
