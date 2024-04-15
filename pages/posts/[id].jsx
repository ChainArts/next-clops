import Layout from "../../components/layout";
import Head from "next/head";
import Date from "../../components/date";
import utilStyles from "../../styles/utils.module.css";
import prisma from '../../lib/prisma';

export const getServerSideProps = async ({ params }) => {
    const post = await prisma.post.findUnique({
        where: {
            id: String(params?.id),
        },
        include: {
            user: {
                select: { name: true },
            },
        },
    });

    post.date = post.date.toISOString();

    return {
      props: { post },
    };
};

export default function Post({ post }) {
    return (
        <Layout>
            <Head>
                <title>{post.title}</title>
            </Head>
            <article>
                <h1 className={utilStyles.headingXl}>{post.title}</h1>
                <div className={utilStyles.lightText}>
                    <Date dateString={post.date} />
                </div>
                <div className={utilStyles.lightText}>
                    By {post.user.name}
                </div>
                <div
                    dangerouslySetInnerHTML={{ __html: post.content}}
                />
            </article>
        </Layout>
    );
}


